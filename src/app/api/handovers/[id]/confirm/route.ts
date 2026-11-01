import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, ItemStatus, HandoverStatus, UserRole } from '@prisma/client';
import { verifyTokenHash } from '@/lib/handover/crypto';

export const dynamic = 'force-dynamic';

const confirmHandoverSchema = z.object({
  code: z.string().optional(),
  qrToken: z.string().optional(),
  moderatorOverride: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function POST(
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
            claimant: true,
            item: {
              include: { college: true, campus: true },
            },
          },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Handover challenge not found' }, { status: 404 });
    }

    if (challenge.status === HandoverStatus.CONFIRMED) {
      return NextResponse.json({ error: 'This handover has already been confirmed and completed' }, { status: 400 });
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

    // The claimant possesses the code; either the finder or the desk officer enters/verifies it.
    // In special cases, if both parties agree or a moderator facilitates, the desk officer or finder confirms.
    if (!isFinder && !isCollegeAdmin && !isClaimant) {
      return NextResponse.json(
        { error: 'You are not authorized to confirm this handover' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = confirmHandoverSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { code, qrToken, moderatorOverride, notes } = result.data;

    // Check expiration
    if (new Date() > challenge.expiresAt) {
      return NextResponse.json(
        { error: 'Handover challenge has expired. Please generate a new verification code.' },
        { status: 400 }
      );
    }

    // Verify code or QR token
    let codeValid = false;
    if (code && verifyTokenHash(code, challenge.codeHash)) {
      codeValid = true;
    } else if (qrToken && challenge.qrTokenHash && verifyTokenHash(qrToken, challenge.qrTokenHash)) {
      codeValid = true;
    } else if (moderatorOverride && isCollegeAdmin) {
      codeValid = true;
    }

    if (!codeValid) {
      return NextResponse.json(
        { error: 'Invalid verification exchange code. Please ensure you entered the exact 6-digit OTP.' },
        { status: 400 }
      );
    }

    // Execute atomic completion
    const returnRecord = await prisma.$transaction(async (tx) => {
      // 1. Update HandoverChallenge
      const updatedChallenge = await tx.handoverChallenge.update({
        where: { id: challenge.id },
        data: {
          status: HandoverStatus.CONFIRMED,
          confirmedByUserId: user.id,
          confirmedAt: new Date(),
        },
      });

      // 2. Update Claim to RETURNED / COMPLETED
      const updatedClaim = await tx.claim.update({
        where: { id: challenge.claimId },
        data: {
          status: ClaimStatus.RETURNED,
          claimantConfirmed: true,
          finderConfirmed: true,
        },
      });

      // 3. Update Item to RETURNED
      const updatedItem = await tx.item.update({
        where: { id: challenge.itemId },
        data: {
          status: ItemStatus.RETURNED,
        },
      });

      // 4. Update status history
      await tx.claimStatusHistory.create({
        data: {
          claimId: challenge.claimId,
          fromStatus: challenge.claim.status,
          toStatus: ClaimStatus.RETURNED,
          actorId: user.id,
          notes: notes || `Handover successfully verified via ${code ? '6-digit OTP' : qrToken ? 'QR token' : 'moderator verification'}.`,
        },
      });

      // 5. Dismiss any remaining active matches or pending claims on this item
      await tx.match.updateMany({
        where: {
          OR: [{ lostItemId: challenge.itemId }, { foundItemId: challenge.itemId }],
          status: 'ACTIVE',
        },
        data: {
          status: 'RESOLVED',
        },
      });

      // 6. Notify Claimant
      await tx.notification.create({
        data: {
          userId: challenge.claim.claimantId,
          type: 'handover_completed',
          title: 'Handover Confirmed! Item Returned 🎉',
          message: `Your item "${challenge.claim.item.name}" has been successfully verified and returned. Thank you for using LostLink!`,
          resourceId: challenge.claimId,
          linkUrl: `/claims/${challenge.claimId}`,
        },
      });

      // 7. Notify Finder
      if (challenge.claim.item.reporterId !== user.id) {
        await tx.notification.create({
          data: {
            userId: challenge.claim.item.reporterId,
            type: 'handover_completed',
            title: 'Return Complete! Thank You 🌟',
            message: `The return of "${challenge.claim.item.name}" has been officially completed. You helped reunite a student with their property!`,
            resourceId: challenge.claimId,
            linkUrl: `/claims/${challenge.claimId}`,
          },
        });
      }

      // 8. Audit log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: challenge.claim.item.collegeId,
          action: 'HANDOVER_CONFIRMED',
          resourceType: 'HANDOVER_CHALLENGE',
          resourceId: challenge.id,
          metadata: JSON.stringify({
            claimId: challenge.claimId,
            itemId: challenge.itemId,
            confirmedBy: user.name,
            method: code ? 'OTP' : qrToken ? 'QR' : 'ADMIN_OVERRIDE',
          }),
        },
      });

      return { updatedChallenge, updatedClaim, updatedItem };
    });

    return NextResponse.json({
      message: 'Physical handover verified! Item status updated to RETURNED.',
      success: true,
      handover: returnRecord.updatedChallenge,
      claim: returnRecord.updatedClaim,
      item: returnRecord.updatedItem,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

