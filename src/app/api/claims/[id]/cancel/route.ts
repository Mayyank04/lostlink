import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, ItemStatus } from '@prisma/client';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (claim.claimantId !== user.id) {
      return NextResponse.json(
        { error: 'Only the student who submitted this claim may cancel it' },
        { status: 403 }
      );
    }

    if (claim.status === ClaimStatus.RETURNED || claim.status === ClaimStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Cannot cancel a completed or returned claim' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.claim.update({
        where: { id },
        data: { status: ClaimStatus.CANCELLED },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: claim.status,
          toStatus: ClaimStatus.CANCELLED,
          actorId: user.id,
          notes: 'Claim cancelled by claimant.',
        },
      });

      // Check if there are other pending claims on this item
      const otherPending = await tx.claim.count({
        where: {
          itemId: claim.itemId,
          status: { in: [ClaimStatus.PENDING, ClaimStatus.UNDER_REVIEW, ClaimStatus.HANDOVER_PENDING] },
          id: { not: claim.id },
        },
      });

      if (otherPending === 0) {
        await tx.item.update({
          where: { id: claim.itemId },
          data: { status: ItemStatus.OPEN },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: claim.item.collegeId,
          action: 'CANCEL_CLAIM',
          resourceType: 'CLAIM',
          resourceId: claim.id,
        },
      });

      return c;
    });

    return NextResponse.json({
      message: 'Claim cancelled successfully',
      claim: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
