import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireCollegeAdmin, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, ItemStatus, HandoverStatus } from '@prisma/client';
import { verifyTokenHash } from '@/lib/handover/crypto';
import { z } from 'zod';

const handoverVerifySchema = z.object({
  claimId: z.string().optional(),
  referenceNumber: z.string().optional(),
  code: z.string().min(4, 'Verification code is required'),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const parsed = handoverVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { claimId, referenceNumber, code, notes } = parsed.data;

    const claim = await prisma.claim.findFirst({
      where: {
        OR: [
          ...(claimId ? [{ id: claimId }] : []),
          ...(referenceNumber ? [{ referenceNumber }] : []),
        ],
      },
      include: {
        item: { include: { college: true } },
        handoverChallenge: true,
        claimant: { select: { id: true, name: true, email: true } },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim record not found' }, { status: 404 });
    }

    requireCollegeAdmin(user, claim.item.collegeId);

    if (claim.status === ClaimStatus.RETURNED) {
      return NextResponse.json({ error: 'This item return has already been confirmed' }, { status: 400 });
    }

    // Check code against claim.handoverCode or handoverChallenge codeHash
    let isValid = false;
    if (claim.handoverCode && claim.handoverCode.trim() === code.trim()) {
      isValid = true;
    } else if (claim.handoverChallenge && verifyTokenHash(code.trim(), claim.handoverChallenge.codeHash)) {
      isValid = true;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification OTP code. Please verify the code displayed on student device.' },
        { status: 400 }
      );
    }

    // Atomic execution
    await prisma.$transaction(async (tx) => {
      if (claim.handoverChallenge) {
        await tx.handoverChallenge.update({
          where: { id: claim.handoverChallenge.id },
          data: {
            status: HandoverStatus.CONFIRMED,
            confirmedByUserId: user.id,
            confirmedAt: new Date(),
          },
        });
      }

      await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: ClaimStatus.RETURNED,
          claimantConfirmed: true,
          finderConfirmed: true,
        },
      });

      await tx.item.update({
        where: { id: claim.itemId },
        data: {
          status: ItemStatus.RETURNED,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: claim.status,
          toStatus: ClaimStatus.RETURNED,
          actorId: user.id,
          notes: notes || 'Item return officially confirmed by college administrator desk.',
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'HANDOVER_CONFIRMED',
          actorId: user.id,
          collegeId: claim.item.collegeId,
          resourceType: 'Claim',
          resourceId: claim.id,
          metadata: JSON.stringify({
            itemReportNumber: claim.item.reportNumber,
            claimReference: claim.referenceNumber,
            claimantEmail: claim.claimant.email,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Item ${claim.item.name} (${claim.item.reportNumber}) has been successfully returned!`,
      itemTitle: claim.item.name,
      reportNumber: claim.item.reportNumber,
      claimantName: claim.claimant.name,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
