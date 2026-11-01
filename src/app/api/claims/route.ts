import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, ItemStatus, UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

const createClaimSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  verificationNotes: z.string().min(5, 'Please provide ownership verification details'),
  evidenceDetails: z.record(z.string(), z.any()).optional(),
  evidenceFileUrl: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const collegeId = searchParams.get('collegeId');

    const isPlatformAdmin = user.role === UserRole.PLATFORM_ADMIN;
    const isCollegeAdmin = user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR;

    let whereClause: any = {};

    if (isPlatformAdmin) {
      if (collegeId) whereClause.item = { collegeId };
    } else if (isCollegeAdmin) {
      const adminCollegeIds = user.memberships.map((m) => m.collegeId);
      whereClause.item = { collegeId: { in: adminCollegeIds } };
    } else {
      whereClause.OR = [
        { claimantId: user.id },
        { item: { reporterId: user.id } },
      ];
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
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = claims.map((c) => ({
      id: c.id,
      itemId: c.itemId,
      itemReportNumber: c.item.reportNumber,
      itemTitle: c.item.name,
      itemCategory: c.item.category,
      itemImageUrl: c.item.images[0]?.url || null,
      collegeName: c.item.college.name,
      campusName: c.item.campus?.name || null,
      claimantId: c.claimantId,
      claimantName: c.claimant.name,
      claimantEmail: c.claimant.email,
      reporterId: c.item.reporterId,
      reporterName: c.item.reporter.name,
      status: c.status,
      verificationNotes: c.additionalProofNotes,
      evidenceDetails: c.privateEvidenceReference,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({ claims: formatted });
  } catch (error) {
    return errorResponse(error);
  }
}

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

    const { itemId, verificationNotes, evidenceDetails, evidenceFileUrl } = result.data;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { reporter: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.reporterId === user.id) {
      return NextResponse.json(
        { error: 'You cannot claim an item you reported yourself' },
        { status: 400 }
      );
    }

    if (item.status === ItemStatus.RETURNED || item.status === ItemStatus.CLOSED) {
      return NextResponse.json(
        { error: 'This item has already been returned or closed' },
        { status: 400 }
      );
    }

    const existingClaim = await prisma.claim.findFirst({
      where: {
        itemId,
        claimantId: user.id,
        status: ClaimStatus.PENDING,
      },
    });

    if (existingClaim) {
      return NextResponse.json(
        { error: 'You already have an active pending claim for this item' },
        { status: 409 }
      );
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const referenceNumber = `CLM-${new Date().getFullYear()}-${randomSuffix}`;

    const claim = await prisma.$transaction(async (tx) => {
      const createdClaim = await tx.claim.create({
        data: {
          referenceNumber,
          itemId,
          claimantId: user.id,
          additionalProofNotes: verificationNotes,
          privateEvidenceReference: JSON.stringify(evidenceDetails || {}),
          status: ClaimStatus.PENDING,
        },
      });

      await tx.item.update({
        where: { id: itemId },
        data: { status: ItemStatus.CLAIM_PENDING },
      });

      await tx.notification.create({
        data: {
          userId: item.reporterId,
          type: 'claim_received',
          title: 'Ownership Claim Submitted',
          message: `${user.name} submitted an ownership claim for "${item.name}". Please review verification evidence.`,
          linkUrl: `/claims`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: item.collegeId,
          action: 'SUBMIT_CLAIM',
          resourceType: 'CLAIM',
          resourceId: createdClaim.id,
          metadata: JSON.stringify({ itemId, referenceNumber }),
        },
      });

      return createdClaim;
    });

    return NextResponse.json(
      {
        message: 'Ownership claim submitted successfully. The finder has been notified.',
        claim,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
