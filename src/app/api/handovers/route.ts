import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, ItemStatus, HandoverStatus, UserRole } from '@prisma/client';
import { generateOTP, generateQrToken, hashToken } from '@/lib/handover/crypto';

export const dynamic = 'force-dynamic';

const createHandoverSchema = z.object({
  claimId: z.string().min(1, 'Claim ID is required'),
  handoverLocation: z.string().optional(),
  verificationMethod: z.enum(['OTP', 'QR', 'MANUAL_MODERATOR']).default('OTP'),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const result = createHandoverSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { claimId, handoverLocation, verificationMethod } = result.data;

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        item: { include: { college: true, campus: true } },
        claimant: true,
        handoverChallenge: true,
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
        { error: 'You are not authorized to initiate a handover challenge for this claim' },
        { status: 403 }
      );
    }

    // Must be in an approvable or pending handover state
    if (
      claim.status !== ClaimStatus.APPROVED &&
      claim.status !== ClaimStatus.HANDOVER_PENDING &&
      claim.status !== ClaimStatus.UNDER_REVIEW &&
      claim.status !== ClaimStatus.PENDING
    ) {
      return NextResponse.json(
        { error: `Cannot generate handover challenge for claim in ${claim.status} status` },
        { status: 400 }
      );
    }

    // Generate new OTP & QR token
    const rawOtp = generateOTP();
    const rawQrToken = generateQrToken();
    const codeHash = hashToken(rawOtp);
    const qrTokenHash = hashToken(rawQrToken);

    // 24 hour expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const defaultLocation =
      handoverLocation ||
      claim.item.campus?.lostFoundDeskRoom ||
      'Official Campus Lost & Found Custody Desk';

    const transactionResult = await prisma.$transaction(async (tx) => {
      // Upsert challenge
      let challenge;
      if (claim.handoverChallenge) {
        challenge = await tx.handoverChallenge.update({
          where: { claimId: claim.id },
          data: {
            codeHash,
            qrTokenHash,
            status: HandoverStatus.PENDING,
            verificationMethod,
            expiresAt,
            handoverLocation: defaultLocation,
            confirmedAt: null,
            confirmedByUserId: null,
          },
        });
      } else {
        challenge = await tx.handoverChallenge.create({
          data: {
            claimId: claim.id,
            itemId: claim.itemId,
            codeHash,
            qrTokenHash,
            status: HandoverStatus.PENDING,
            verificationMethod,
            expiresAt,
            handoverLocation: defaultLocation,
          },
        });
      }

      // Update claim to HANDOVER_PENDING and save handoverCode for claimant display
      await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: ClaimStatus.HANDOVER_PENDING,
          handoverLocation: defaultLocation,
          handoverCode: rawOtp,
        },
      });

      // Update item to CLAIM_PENDING
      await tx.item.update({
        where: { id: claim.itemId },
        data: {
          status: ItemStatus.CLAIM_PENDING,
        },
      });

      // Status history entry
      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: claim.status,
          toStatus: ClaimStatus.HANDOVER_PENDING,
          actorId: user.id,
          notes: `Handover verification challenge created. Target location: ${defaultLocation}`,
        },
      });

      // Notify claimant with instructions
      await tx.notification.create({
        data: {
          userId: claim.claimantId,
          type: 'handover_ready',
          title: 'Handover Verification Ready 🔐',
          message: `Your return challenge for "${claim.item.name}" has been generated. Present your 6-digit OTP during physical pickup at ${defaultLocation}.`,
          resourceId: claim.id,
          linkUrl: `/claims/${claim.id}`,
        },
      });

      // Notify finder that handover is scheduled
      if (claim.item.reporterId !== user.id) {
        await tx.notification.create({
          data: {
            userId: claim.item.reporterId,
            type: 'handover_ready',
            title: 'Item Return Ready for Verification',
            message: `Owner is ready for return of "${claim.item.name}". Meet at ${defaultLocation} to confirm exchange code.`,
            resourceId: claim.id,
            linkUrl: `/claims/${claim.id}`,
          },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: claim.item.collegeId,
          action: 'HANDOVER_CHALLENGE_CREATED',
          resourceType: 'HANDOVER_CHALLENGE',
          resourceId: challenge.id,
          metadata: JSON.stringify({ claimId: claim.id, expiresAt: expiresAt.toISOString(), location: defaultLocation }),
        },
      });

      return challenge;
    });

    return NextResponse.json({
      message: 'Handover challenge successfully initialized',
      handover: {
        id: transactionResult.id,
        claimId: claim.id,
        status: transactionResult.status,
        expiresAt: transactionResult.expiresAt.toISOString(),
        handoverLocation: defaultLocation,
        verificationMethod,
        // The plain exchange OTP and QR verifier token returned for authorized presentation
        exchangeOtp: rawOtp,
        qrToken: rawQrToken,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
