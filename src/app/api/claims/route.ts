import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { claimService } from '@/server/services/claim.service';
import { ClaimStatus, UserRole } from '@prisma/client';

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

    const createdClaim = await claimService.submitClaim(user, result.data);

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
