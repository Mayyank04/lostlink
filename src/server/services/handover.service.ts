import { handoverRepository } from '../repositories/handover.repository';
import { claimRepository } from '../repositories/claim.repository';
import { AuthenticatedUser } from '@/lib/auth/session';
import { generateOTP, generateQrToken, hashToken, verifyTokenHash } from '@/lib/handover/crypto';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { HandoverStatus, ClaimStatus, ItemStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

export const handoverService = {
  async initiateHandover(user: AuthenticatedUser, claimId: string, location?: string) {
    const claim = await claimRepository.findById(claimId);
    if (!claim) {
      throw new NotFoundError('Claim not found');
    }

    if (claim.status !== ClaimStatus.APPROVED && claim.status !== ClaimStatus.HANDOVER_PENDING) {
      throw new ValidationError('Claim must be approved before scheduling custody handover');
    }

    const plainOtp = generateOTP();
    const qrToken = generateQrToken();
    const codeHash = hashToken(plainOtp);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const challenge = await handoverRepository.createChallenge({
      claim: { connect: { id: claimId } },
      item: { connect: { id: claim.itemId } },
      codeHash,
      qrTokenHash: hashToken(qrToken),
      expiresAt,
      status: HandoverStatus.PENDING,
      handoverLocation: location || 'Main Campus Custody Desk',
    });

    await prisma.claim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.HANDOVER_PENDING, handoverLocation: challenge.handoverLocation },
    });

    return {
      challengeId: challenge.id,
      plainOtp,
      expiresAt,
      location: challenge.handoverLocation,
    };
  },

  async confirmHandover(
    user: AuthenticatedUser,
    challengeId: string,
    plainOtp: string,
    notes?: string
  ) {
    const challenge = await handoverRepository.findById(challengeId);
    if (!challenge) {
      throw new NotFoundError('Handover challenge not found');
    }

    if (challenge.status !== HandoverStatus.PENDING) {
      throw new ValidationError('Handover challenge is no longer pending');
    }

    if (new Date() > challenge.expiresAt) {
      await handoverRepository.update(challengeId, { status: HandoverStatus.EXPIRED });
      throw new ValidationError('Handover verification code has expired');
    }

    const isValid = verifyTokenHash(plainOtp.trim(), challenge.codeHash);
    if (!isValid) {
      throw new ValidationError('Invalid 6-digit exchange verification code');
    }

    return prisma.$transaction(async (tx) => {
      const updatedChallenge = await tx.handoverChallenge.update({
        where: { id: challengeId },
        data: {
          status: HandoverStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedByUserId: user.id,
        },
      });

      await tx.claim.update({
        where: { id: challenge.claimId },
        data: { status: ClaimStatus.RETURNED },
      });

      await tx.item.update({
        where: { id: challenge.claim.itemId },
        data: { status: ItemStatus.RETURNED },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: challenge.claimId,
          fromStatus: ClaimStatus.HANDOVER_PENDING,
          toStatus: ClaimStatus.RETURNED,
          actorId: user.id,
          notes: notes || 'Physical handover authenticated via 6-digit OTP code.',
        },
      });

      return updatedChallenge;
    });
  },
};
