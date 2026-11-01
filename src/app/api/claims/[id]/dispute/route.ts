import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

const disputeSchema = z.object({
  reason: z.string().min(5, 'Please provide a clear reason for disputing this claim'),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        item: { include: { college: true } },
        claimant: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const isClaimant = claim.claimantId === user.id;
    const isFinder = claim.item.reporterId === user.id;
    const isCollegeAdmin =
      user.role === UserRole.PLATFORM_ADMIN ||
      user.memberships.some(
        (m) =>
          m.collegeId === claim.item.collegeId &&
          (user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR)
      );

    if (!isClaimant && !isFinder && !isCollegeAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to dispute this claim' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = disputeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { reason } = result.data;

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.claim.update({
        where: { id },
        data: {
          status: ClaimStatus.DISPUTED,
          rejectionReason: reason,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: claim.status,
          toStatus: ClaimStatus.DISPUTED,
          actorId: user.id,
          reasonCode: 'DISPUTED_BY_USER',
          notes: reason,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: claim.item.collegeId,
          action: 'CLAIM_DISPUTED',
          resourceType: 'CLAIM',
          resourceId: claim.id,
          metadata: JSON.stringify({ reason }),
        },
      });

      // Notify other parties
      const targetUserIds = [claim.claimantId, claim.item.reporterId].filter((uid) => uid !== user.id);
      for (const targetId of targetUserIds) {
        await tx.notification.create({
          data: {
            userId: targetId,
            type: 'claim_disputed',
            title: 'Claim Marked as Disputed ⚠️',
            message: `A dispute has been raised on claim for "${claim.item.name}": ${reason}. Campus security desk will arbitrate.`,
            resourceId: claim.id,
            linkUrl: `/claims/${claim.id}`,
          },
        });
      }

      return c;
    });

    return NextResponse.json({
      message: 'Claim disputed successfully; forwarded to campus moderator',
      claim: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
