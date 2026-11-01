import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const challenge = await prisma.handoverChallenge.findFirst({
      where: {
        OR: [{ id }, { claimId: id }],
      },
      include: {
        claim: {
          include: {
            claimant: { select: { id: true, name: true, email: true } },
            item: {
              include: {
                college: { select: { id: true, name: true } },
                campus: { select: { id: true, name: true, lostFoundDeskRoom: true } },
                reporter: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Handover challenge not found' }, { status: 404 });
    }

    const isClaimant = challenge.claim.claimantId === user.id;
    const isFinder = challenge.claim.item.reporterId === user.id;
    const isCollegeAdmin =
      user.role === UserRole.PLATFORM_ADMIN ||
      user.memberships.some(
        (m) =>
          m.collegeId === challenge.claim.item.collegeId &&
          (user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR)
      );

    if (!isClaimant && !isFinder && !isCollegeAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to view this handover verification' },
        { status: 403 }
      );
    }

    const isExpired = new Date() > challenge.expiresAt;

    return NextResponse.json({
      handover: {
        id: challenge.id,
        claimId: challenge.claimId,
        itemId: challenge.itemId,
        itemTitle: challenge.claim.item.name,
        itemReportNumber: challenge.claim.item.reportNumber,
        status: challenge.status,
        verificationMethod: challenge.verificationMethod,
        expiresAt: challenge.expiresAt.toISOString(),
        isExpired,
        handoverLocation: challenge.handoverLocation,
        confirmedAt: challenge.confirmedAt ? challenge.confirmedAt.toISOString() : null,
        claimantName: challenge.claim.claimant.name,
        finderName: challenge.claim.item.reporter.name,
        userRoleInHandover: isClaimant ? 'claimant' : isFinder ? 'finder' : 'moderator',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
