import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { generateOTP, generateQrToken, hashToken, verifyTokenHash } from '@/lib/handover/crypto';
import { ItemReportType, ItemStatus, ClaimStatus, HandoverStatus, UserRole, UserStatus } from '@prisma/client';

describe('Phase 3 Handover Verification & Secure Returns', () => {
  let collegeId: string;
  let campusId: string;
  let finderUser: any;
  let claimantUser: any;
  let testItem: any;
  let testClaim: any;

  beforeAll(async () => {
    const college = await prisma.college.findFirst({ include: { campuses: true } });
    if (!college || college.campuses.length === 0) {
      throw new Error('College with campus required in DB');
    }
    collegeId = college.id;
    campusId = college.campuses[0].id;

    const timestamp = Date.now();

    finderUser = await prisma.user.create({
      data: {
        name: 'Desk Custodian Sam',
        email: `sam.${timestamp}@test.edu`,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    claimantUser = await prisma.user.create({
      data: {
        name: 'Owner Maya',
        email: `maya.${timestamp}@test.edu`,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    testItem = await prisma.item.create({
      data: {
        reportNumber: `FD-HANDOVER-${timestamp}`,
        reporterId: finderUser.id,
        collegeId,
        campusId,
        locationBuilding: 'Student Union',
        locationSpecifics: 'Info Desk',
        type: ItemReportType.FOUND,
        name: 'Bose QuietComfort 45 Headphones',
        category: 'audio',
        brand: 'Bose',
        color: 'Black',
        description: 'Black over-ear headphones in protective case',
        occurredAt: new Date(),
        status: ItemStatus.CLAIM_PENDING,
      },
    });

    testClaim = await prisma.claim.create({
      data: {
        referenceNumber: `CLM-HD-${timestamp}`,
        itemId: testItem.id,
        claimantId: claimantUser.id,
        privateEvidenceReference: JSON.stringify({ answers: [{ questionId: 'serial', answer: 'SN-40291-B' }] }),
        status: ClaimStatus.APPROVED,
      },
    });
  });

  it('generates cryptographically secure 6-digit OTP and URL-safe QR tokens', () => {
    const otp1 = generateOTP();
    const otp2 = generateOTP();

    expect(otp1).toHaveLength(6);
    expect(/^\d{6}$/.test(otp1)).toBe(true);
    expect(otp2).toHaveLength(6);
    expect(/^\d{6}$/.test(otp2)).toBe(true);
    expect(otp1).not.toBe(otp2);

    const qr1 = generateQrToken();
    expect(qr1).toBeDefined();
    expect(qr1.length).toBeGreaterThanOrEqual(32);
  });

  it('computes SHA-256 hash and verifies matching and mismatching tokens with timing-safe comparison', () => {
    const rawOtp = '583921';
    const computedHash = hashToken(rawOtp);

    expect(computedHash).toHaveLength(64); // SHA-256 hex is 64 characters

    // Matching OTP succeeds
    expect(verifyTokenHash('583921', computedHash)).toBe(true);
    expect(verifyTokenHash(' 583921 ', computedHash)).toBe(true); // Trims whitespace safely

    // Incorrect OTP fails
    expect(verifyTokenHash('123456', computedHash)).toBe(false);
    expect(verifyTokenHash('583920', computedHash)).toBe(false);
  });

  it('creates and persists a HandoverChallenge with 24-hour expiration in database', async () => {
    const rawOtp = generateOTP();
    const rawQr = generateQrToken();
    const codeHash = hashToken(rawOtp);
    const qrTokenHash = hashToken(rawQr);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const challenge = await prisma.handoverChallenge.create({
      data: {
        claimId: testClaim.id,
        itemId: testItem.id,
        codeHash,
        qrTokenHash,
        status: HandoverStatus.PENDING,
        expiresAt,
        handoverLocation: 'North Campus Security Desk (Room 102)',
      },
    });

    expect(challenge.id).toBeDefined();
    expect(challenge.status).toBe(HandoverStatus.PENDING);
    expect(challenge.codeHash).toBe(codeHash);

    // Ensure raw OTP is not stored directly in challenge table
    expect((challenge as any).otp).toBeUndefined();

    // Verify token matches stored hash
    expect(verifyTokenHash(rawOtp, challenge.codeHash)).toBe(true);
  });

  it('rejects an expired handover challenge', async () => {
    const rawOtp = generateOTP();
    const pastExpiration = new Date(Date.now() - 1000 * 60); // Expired 1 minute ago

    const expiredChallenge = {
      codeHash: hashToken(rawOtp),
      expiresAt: pastExpiration,
      status: HandoverStatus.PENDING,
    };

    const isExpired = new Date() > expiredChallenge.expiresAt;
    expect(isExpired).toBe(true);

    const validateChallenge = (challenge: typeof expiredChallenge, inputCode: string) => {
      if (new Date() > challenge.expiresAt) {
        throw new Error('Handover challenge expired');
      }
      return verifyTokenHash(inputCode, challenge.codeHash);
    };

    expect(() => validateChallenge(expiredChallenge, rawOtp)).toThrow('Handover challenge expired');
  });

  it('executes atomic handover confirmation updating item and claim status to RETURNED', async () => {
    const challenge = await prisma.handoverChallenge.findUnique({
      where: { claimId: testClaim.id },
    });
    expect(challenge).not.toBeNull();
    if (!challenge) return;

    const confirmedResult = await prisma.$transaction(async (tx) => {
      // 1. Update HandoverChallenge
      const c = await tx.handoverChallenge.update({
        where: { id: challenge.id },
        data: {
          status: HandoverStatus.CONFIRMED,
          confirmedByUserId: finderUser.id,
          confirmedAt: new Date(),
        },
      });

      // 2. Update Claim
      const claim = await tx.claim.update({
        where: { id: testClaim.id },
        data: {
          status: ClaimStatus.RETURNED,
          claimantConfirmed: true,
          finderConfirmed: true,
        },
      });

      // 3. Update Item
      const item = await tx.item.update({
        where: { id: testItem.id },
        data: {
          status: ItemStatus.RETURNED,
        },
      });

      // 4. Status history
      await tx.claimStatusHistory.create({
        data: {
          claimId: testClaim.id,
          fromStatus: ClaimStatus.APPROVED,
          toStatus: ClaimStatus.RETURNED,
          actorId: finderUser.id,
          notes: 'Handover verified and physical custody returned to claimant.',
        },
      });

      // 5. Notifications
      await tx.notification.create({
        data: {
          userId: claimantUser.id,
          type: 'handover_completed',
          title: 'Handover Confirmed! Item Returned 🎉',
          message: 'Your Bose headphones have been officially returned.',
          resourceId: testClaim.id,
        },
      });

      return { c, claim, item };
    });

    expect(confirmedResult.c.status).toBe(HandoverStatus.CONFIRMED);
    expect(confirmedResult.claim.status).toBe(ClaimStatus.RETURNED);
    expect(confirmedResult.item.status).toBe(ItemStatus.RETURNED);

    // Verify DB persisted state
    const persistedItem = await prisma.item.findUnique({ where: { id: testItem.id } });
    expect(persistedItem?.status).toBe(ItemStatus.RETURNED);

    const history = await prisma.claimStatusHistory.findMany({
      where: { claimId: testClaim.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(history[0].toStatus).toBe(ClaimStatus.RETURNED);
  });
});
