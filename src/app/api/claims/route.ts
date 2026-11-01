import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, ItemStatus, UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

const createClaimSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  linkedLostItemId: z.string().optional().nullable(),
  verificationNotes: z.string().min(5, 'Please provide ownership verification details'),
  evidenceDetails: z.record(z.string(), z.any()).optional(),
  evidenceFileUrl: z.string().optional().nullable(),
});

/**
 * GET /api/claims - Retrieve authorized claims
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const collegeId = searchParams.get('collegeId');
    const status = searchParams.get('status') as ClaimStatus | null;

    const isPlatformAdmin = user.role === UserRole.PLATFORM_ADMIN;
    const isCollegeAdmin = user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR;

    let whereClause: any = {};

    if (isPlatformAdmin) {
      if (collegeId) whereClause.item = { collegeId };
    } else if (isCollegeAdmin) {
      const adminCollegeIds = user.memberships.map((m) => m.collegeId);
      whereClause.item = { collegeId: { in: adminCollegeIds } };
    } else {
      // Regular student: claims they made OR claims on items they reported
      whereClause.OR = [
        { claimantId: user.id },
        { item: { reporterId: user.id } },
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    const claims = await prisma.claim.findMany({
      where: whereClause,
      include: {
        claimant: { select: { id: true, name: true, email: true } },
        item: {
          include: {
            college: { select: { id: true, name: true } },
            campus: { select: { id: true, name: true } },
            images: true,
            reporter: { select: { id: true, name: true, email: true } },
          },
        },
        handoverChallenge: { select: { id: true, status: true, expiresAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = claims.map((c) => ({
      id: c.id,
      referenceNumber: c.referenceNumber,
      itemId: c.itemId,
      itemReportNumber: c.item.reportNumber,
      itemTitle: c.item.name,
      itemCategory: c.item.category,
      itemImageUrl: c.item.images[0]?.url || null,
      collegeId: c.item.collegeId,
      collegeName: c.item.college.name,
      campusName: c.item.campus?.name || null,
      claimantId: c.claimantId,
      claimantName: c.claimant.name,
      claimantEmail: c.claimant.email,
      reporterId: c.item.reporterId,
      reporterName: c.item.reporter.name,
      status: c.status,
      verificationNotes: c.additionalProofNotes,
      hasHandoverChallenge: Boolean(c.handoverChallenge),
      handoverStatus: c.handoverChallenge?.status || null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({ claims: formatted });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/claims - Create a new ownership verification claim
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const result = createClaimSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid claim request' },
        { status: 400 }
      );
    }

    const { itemId, linkedLostItemId, verificationNotes, evidenceDetails } = result.data;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { reporter: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Anti-self-claim protection (Part 2.2 & 4.3)
    if (item.reporterId === user.id) {
      return NextResponse.json(
        { error: 'Self-claim prohibited: You cannot claim an item you reported found yourself.' },
        { status: 400 }
      );
    }

    // Check item status eligibility
    if (item.status === ItemStatus.RETURNED || item.status === ItemStatus.CLOSED) {
      return NextResponse.json(
        { error: 'This item has already been marked as returned or closed.' },
        { status: 400 }
      );
    }

    // Prevent duplicate active claims from same student (Part 4.4)
    const existingActiveClaim = await prisma.claim.findFirst({
      where: {
        itemId,
        claimantId: user.id,
        status: { in: [ClaimStatus.PENDING, ClaimStatus.UNDER_REVIEW, ClaimStatus.APPROVED, ClaimStatus.HANDOVER_PENDING] },
      },
    });

    if (existingActiveClaim) {
      return NextResponse.json(
        { error: 'You already have an active claim pending review for this item.' },
        { status: 409 }
      );
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const referenceNumber = `CLM-${new Date().getFullYear()}-${randomSuffix}`;

    const createdClaim = await prisma.$transaction(async (tx) => {
      // 1. Create claim
      const claim = await tx.claim.create({
        data: {
          referenceNumber,
          itemId,
          claimantId: user.id,
          linkedLostItemId: linkedLostItemId || null,
          additionalProofNotes: verificationNotes,
          privateEvidenceReference: JSON.stringify(evidenceDetails || {}),
          status: ClaimStatus.PENDING,
        },
      });

      // 2. Record initial status history event
      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: ClaimStatus.PENDING,
          toStatus: ClaimStatus.PENDING,
          actorId: user.id,
          notes: 'Claim initiated by student with private ownership evidence.',
        },
      });

      // 3. Update item status to CLAIM_PENDING
      await tx.item.update({
        where: { id: itemId },
        data: { status: ItemStatus.CLAIM_PENDING },
      });

      // 4. Notify Finder
      await tx.notification.create({
        data: {
          userId: item.reporterId,
          type: 'claim_received',
          title: 'Ownership Claim Submitted',
          message: `${user.name} submitted an ownership claim for "${item.name}". Please review verification evidence.`,
          resourceId: claim.id,
          linkUrl: `/claims/${claim.id}`,
        },
      });

      // 5. Notify Claimant confirmation
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'claim_received',
          title: `Claim Submitted (${referenceNumber})`,
          message: `Your ownership claim for "${item.name}" has been logged and is awaiting moderation review.`,
          resourceId: claim.id,
          linkUrl: `/claims/${claim.id}`,
        },
      });

      // 6. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: item.collegeId,
          action: 'CREATE_CLAIM',
          resourceType: 'CLAIM',
          resourceId: claim.id,
          metadata: JSON.stringify({ itemId, referenceNumber }),
        },
      });

      return claim;
    });

    return NextResponse.json(
      {
        message: 'Ownership claim submitted successfully. The finder and college custodians have been notified.',
        claim: createdClaim,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
