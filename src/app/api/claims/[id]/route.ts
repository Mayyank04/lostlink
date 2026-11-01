import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, ItemStatus, UserRole } from '@prisma/client';

const reviewClaimSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            college: true,
          },
        },
        claimant: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const isItemFinder = claim.item.reporterId === user.id;
    const isCollegeAdmin = user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR;
    const isPlatformAdmin = user.role === UserRole.PLATFORM_ADMIN;

    if (!isItemFinder && !isCollegeAdmin && !isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Only the finder or an institutional moderator may review this claim' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = reviewClaimSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid review status' }, { status: 400 });
    }

    const { status, reviewNotes } = result.data;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedClaim = await tx.claim.update({
        where: { id },
        data: {
          status: status === 'APPROVED' ? ClaimStatus.APPROVED : ClaimStatus.REJECTED,
          additionalProofNotes: reviewNotes
            ? `${claim.additionalProofNotes || ''}\n[Reviewer Note]: ${reviewNotes}`
            : claim.additionalProofNotes,
          reviewedBy: user.id,
          reviewedAt: new Date(),
        },
      });

      if (status === 'APPROVED') {
        await tx.item.update({
          where: { id: claim.itemId },
          data: { status: ItemStatus.RETURNED },
        });

        await tx.notification.create({
          data: {
            userId: claim.claimantId,
            type: 'claim_approved',
            title: 'Claim Approved! 🎉',
            message: `Your ownership claim for "${claim.item.name}" has been approved! Coordinate return via the campus office.`,
            linkUrl: `/claims`,
          },
        });
      } else {
        const pendingOtherClaims = await tx.claim.count({
          where: {
            itemId: claim.itemId,
            status: ClaimStatus.PENDING,
            id: { not: claim.id },
          },
        });

        await tx.item.update({
          where: { id: claim.itemId },
          data: {
            status: pendingOtherClaims > 0 ? ItemStatus.CLAIM_PENDING : ItemStatus.OPEN,
          },
        });

        await tx.notification.create({
          data: {
            userId: claim.claimantId,
            type: 'claim_rejected',
            title: 'Claim Verification Declined',
            message: `Your claim for "${claim.item.name}" could not be verified by the finder.`,
            linkUrl: `/claims`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: claim.item.collegeId,
          action: status === 'APPROVED' ? 'APPROVE_CLAIM' : 'REJECT_CLAIM',
          resourceType: 'CLAIM',
          resourceId: claim.id,
          metadata: JSON.stringify({ itemId: claim.itemId, status }),
        },
      });

      return updatedClaim;
    });

    return NextResponse.json({
      message: `Claim successfully ${status.toLowerCase()}`,
      claim: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
