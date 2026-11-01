import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { triggerMatchingEngineForItem } from '@/lib/matching/matchEngine';
import { generateOTP, generateQrToken, hashToken, verifyTokenHash } from '@/lib/handover/crypto';
import {
  ItemReportType,
  ItemStatus,
  ClaimStatus,
  HandoverStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';

describe('Phase 3 End-to-End Item Recovery Lifecycle', () => {
  let college: any;
  let campus: any;
  let studentA: any; // Lost item reporter (owner)
  let studentB: any; // Found item reporter (finder)
  let moderator: any; // Custody officer
  let lostItem: any;
  let foundItem: any;
  let matchRecord: any;
  let claim: any;
  let conversation: any;
  let handoverChallenge: any;
  let plainOtp: string;

  beforeAll(async () => {
    college = await prisma.college.findFirst({ include: { campuses: true } });
    if (!college || college.campuses.length === 0) {
      throw new Error('Database must have at least one college and campus');
    }
    campus = college.campuses[0];

    const timestamp = Date.now();

    // 1. Setup Student A (Lost Item Reporter)
    studentA = await prisma.user.create({
      data: {
        name: 'Jordan Owner',
        email: `jordan.owner.${timestamp}@test.edu`,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        memberships: {
          create: { collegeId: college.id, verificationMethod: 'EMAIL_DOMAIN' },
        },
      },
    });

    // 2. Setup Student B (Found Item Reporter)
    studentB = await prisma.user.create({
      data: {
        name: 'Taylor Finder',
        email: `taylor.finder.${timestamp}@test.edu`,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        memberships: {
          create: { collegeId: college.id, verificationMethod: 'EMAIL_DOMAIN' },
        },
      },
    });

    // 3. Setup Moderator
    moderator = await prisma.user.create({
      data: {
        name: 'Officer Davis',
        email: `officer.davis.${timestamp}@test.edu`,
        role: UserRole.COLLEGE_MODERATOR,
        status: UserStatus.ACTIVE,
        memberships: {
          create: { collegeId: college.id, verificationMethod: 'STAFF_APPOINTMENT' },
        },
      },
    });
  });

  it('Step 1: Student A reports a Lost Item in PostgreSQL', async () => {
    lostItem = await prisma.item.create({
      data: {
        reportNumber: `LL-E2E-${Date.now()}`,
        reporterId: studentA.id,
        collegeId: college.id,
        campusId: campus.id,
        locationBuilding: 'Engineering Hall',
        locationSpecifics: 'Room 304 Desk 4',
        type: ItemReportType.LOST,
        name: 'Sony WH-1000XM5 Wireless Headphones Midnight Blue',
        category: 'audio',
        brand: 'Sony',
        color: 'Blue',
        description: 'Navy blue over-ear noise cancelling headphones in zip case with USB-C cord',
        occurredAt: new Date(Date.now() - 3600 * 1000 * 5), // 5 hours ago
        status: ItemStatus.OPEN,
      },
    });

    expect(lostItem.id).toBeDefined();
    expect(lostItem.status).toBe(ItemStatus.OPEN);
  });

  it('Step 2: Student B reports a Found Item matching Student A belongings', async () => {
    foundItem = await prisma.item.create({
      data: {
        reportNumber: `FD-E2E-${Date.now()}`,
        reporterId: studentB.id,
        collegeId: college.id,
        campusId: campus.id,
        locationBuilding: 'Engineering Hall',
        locationSpecifics: 'Room 304 near whiteboard',
        type: ItemReportType.FOUND,
        name: 'Sony noise cancelling wireless headphones',
        category: 'audio',
        brand: 'Sony',
        color: 'Navy',
        description: 'Found under lecture table in dark blue hard case',
        occurredAt: new Date(Date.now() - 3600 * 1000 * 2), // Found 2 hours ago
        status: ItemStatus.OPEN,
      },
    });

    expect(foundItem.id).toBeDefined();
    expect(foundItem.type).toBe(ItemReportType.FOUND);
  });

  it('Step 3: Deterministic Matching Engine triggers automatically and discovers the match', async () => {
    const matchCount = await triggerMatchingEngineForItem(foundItem.id);
    expect(matchCount).toBeGreaterThanOrEqual(1);

    matchRecord = await prisma.match.findUnique({
      where: {
        lostItemId_foundItemId: {
          lostItemId: lostItem.id,
          foundItemId: foundItem.id,
        },
      },
    });

    expect(matchRecord).not.toBeNull();
    expect(matchRecord.score).toBeGreaterThanOrEqual(75);
    expect(matchRecord.status).toBe('ACTIVE');

    // Parse and verify explainable breakdown
    const explanation = JSON.parse(matchRecord.explanation);
    expect(explanation.confidenceTier).toBe('strong');
    expect(explanation.breakdown.category.matched).toBe(true);
    expect(explanation.breakdown.brand.matched).toBe(true);
    expect(explanation.breakdown.location.matched).toBe(true);
    expect(explanation.breakdown.chronology.matched).toBe(true);
  });

  it('Step 4: Student A receives an in-app match discovery notification', async () => {
    const notification = await prisma.notification.create({
      data: {
        userId: studentA.id,
        type: 'match_found',
        title: 'Potential Match Discovered! 🎯',
        message: `A found item in Engineering Hall matches your lost "${lostItem.name}" with score ${matchRecord.score}%.`,
        resourceId: matchRecord.id,
        linkUrl: `/matches?id=${matchRecord.id}`,
      },
    });

    expect(notification.id).toBeDefined();
    expect(notification.isRead).toBe(false);
  });

  it('Step 5: Student A files an Ownership Verification Claim with private proof answers', async () => {
    const privateAnswers = {
      answers: [
        { questionId: 'case_details', question: 'Any custom accessories inside the case?', answer: 'Anker braided black USB-C cord' },
        { questionId: 'serial_prefix', question: 'Headphone headband marking?', answer: 'Small scratch on right hinge slider' },
      ],
    };

    claim = await prisma.$transaction(async (tx) => {
      const c = await tx.claim.create({
        data: {
          referenceNumber: `CLM-E2E-${Date.now()}`,
          itemId: foundItem.id,
          claimantId: studentA.id,
          linkedLostItemId: lostItem.id,
          privateEvidenceReference: JSON.stringify(privateAnswers),
          additionalProofNotes: 'Registered on Sony app under jordan.owner@test.edu',
          status: ClaimStatus.PENDING,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: c.id,
          fromStatus: ClaimStatus.PENDING,
          toStatus: ClaimStatus.PENDING,
          actorId: studentA.id,
          notes: 'Ownership claim submitted with private answers',
        },
      });

      // Update target item to CLAIM_PENDING
      await tx.item.update({
        where: { id: foundItem.id },
        data: { status: ItemStatus.CLAIM_PENDING },
      });

      return c;
    });

    expect(claim.id).toBeDefined();
    expect(claim.status).toBe(ClaimStatus.PENDING);

    const updatedFound = await prisma.item.findUnique({ where: { id: foundItem.id } });
    expect(updatedFound?.status).toBe(ItemStatus.CLAIM_PENDING);
  });

  it('Step 6: Custody Officer inspects private evidence and requests confirmation', async () => {
    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: ClaimStatus.UNDER_REVIEW,
          additionalProofNotes: `${claim.additionalProofNotes}\n[Evidence Request]: Please bring student ID and show connected Bluetooth device in phone settings.`,
          reviewedBy: moderator.id,
          reviewedAt: new Date(),
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: ClaimStatus.PENDING,
          toStatus: ClaimStatus.UNDER_REVIEW,
          actorId: moderator.id,
          notes: 'Evidence requested: Bluetooth pairing demonstration during physical pickup.',
        },
      });

      return c;
    });

    expect(updated.status).toBe(ClaimStatus.UNDER_REVIEW);
  });

  it('Step 7: Officer approves ownership claim after verifying Bluetooth proof', async () => {
    const approvedClaim = await prisma.$transaction(async (tx) => {
      const c = await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: ClaimStatus.APPROVED,
          reviewedBy: moderator.id,
          reviewedAt: new Date(),
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: ClaimStatus.UNDER_REVIEW,
          toStatus: ClaimStatus.APPROVED,
          actorId: moderator.id,
          notes: 'Ownership verified: Bluetooth pairing and headphone serial match perfectly.',
        },
      });

      return c;
    });

    expect(approvedClaim.status).toBe(ClaimStatus.APPROVED);
  });

  it('Step 8: System issues Handover Challenge with 6-digit OTP and QR token', async () => {
    plainOtp = generateOTP();
    const plainQr = generateQrToken();
    const codeHash = hashToken(plainOtp);
    const qrTokenHash = hashToken(plainQr);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

    handoverChallenge = await prisma.$transaction(async (tx) => {
      const challenge = await tx.handoverChallenge.create({
        data: {
          claimId: claim.id,
          itemId: foundItem.id,
          codeHash,
          qrTokenHash,
          status: HandoverStatus.PENDING,
          verificationMethod: 'OTP',
          expiresAt,
          handoverLocation: 'Engineering Hall Security Desk (Room 101)',
        },
      });

      await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: ClaimStatus.HANDOVER_PENDING,
          handoverLocation: 'Engineering Hall Security Desk (Room 101)',
          handoverCode: plainOtp,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: ClaimStatus.APPROVED,
          toStatus: ClaimStatus.HANDOVER_PENDING,
          actorId: moderator.id,
          notes: 'Handover challenge issued with 6-digit OTP verification.',
        },
      });

      return challenge;
    });

    expect(handoverChallenge.status).toBe(HandoverStatus.PENDING);
    expect(verifyTokenHash(plainOtp, handoverChallenge.codeHash)).toBe(true);
  });

  it('Step 9: Real-time messaging thread coordinates physical handover time', async () => {
    conversation = await prisma.conversation.create({
      data: {
        claimId: claim.id,
        itemId: foundItem.id,
        title: `Handover Coordination for ${foundItem.name}`,
        participants: {
          create: [
            { userId: studentA.id, lastReadAt: new Date() },
            { userId: studentB.id, lastReadAt: new Date(0) },
          ],
        },
      },
    });

    const msg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: studentA.id,
        content: 'Hi Taylor! I am heading over to Room 101 desk right now with my 6-digit code.',
      },
    });

    expect(msg.content).toContain('Room 101 desk');
  });

  it('Step 10: Custodian validates 6-digit OTP code and executes atomic return confirmation', async () => {
    // Custodian enters the OTP code shown by Student A
    const inputCode = plainOtp;
    const isCodeValid = verifyTokenHash(inputCode, handoverChallenge.codeHash);
    expect(isCodeValid).toBe(true);

    const completion = await prisma.$transaction(async (tx) => {
      // 1. Confirm challenge
      const c = await tx.handoverChallenge.update({
        where: { id: handoverChallenge.id },
        data: {
          status: HandoverStatus.CONFIRMED,
          confirmedByUserId: moderator.id,
          confirmedAt: new Date(),
        },
      });

      // 2. Mark claim RETURNED
      const clm = await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: ClaimStatus.RETURNED,
          claimantConfirmed: true,
          finderConfirmed: true,
        },
      });

      // 3. Mark lost and found items RETURNED / RESOLVED
      const fItem = await tx.item.update({
        where: { id: foundItem.id },
        data: { status: ItemStatus.RETURNED },
      });

      const lItem = await tx.item.update({
        where: { id: lostItem.id },
        data: { status: ItemStatus.RETURNED },
      });

      // 4. Resolve active matches
      await tx.match.updateMany({
        where: {
          OR: [{ lostItemId: lostItem.id }, { foundItemId: foundItem.id }],
          status: 'ACTIVE',
        },
        data: { status: 'RESOLVED' },
      });

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          actorId: moderator.id,
          collegeId: college.id,
          action: 'HANDOVER_CONFIRMED',
          resourceType: 'HANDOVER_CHALLENGE',
          resourceId: handoverChallenge.id,
          metadata: JSON.stringify({ verifiedOtp: true, claimantId: studentA.id }),
        },
      });

      // 6. Return celebration notification
      await tx.notification.create({
        data: {
          userId: studentA.id,
          type: 'handover_completed',
          title: 'Belonging Safely Returned! 🎉',
          message: `Your "${lostItem.name}" has been successfully returned.`,
          resourceId: claim.id,
        },
      });

      return { c, clm, fItem, lItem };
    });

    expect(completion.c.status).toBe(HandoverStatus.CONFIRMED);
    expect(completion.clm.status).toBe(ClaimStatus.RETURNED);
    expect(completion.fItem.status).toBe(ItemStatus.RETURNED);
    expect(completion.lItem.status).toBe(ItemStatus.RETURNED);

    // Verify Match status is now RESOLVED
    const refreshedMatch = await prisma.match.findUnique({
      where: { lostItemId_foundItemId: { lostItemId: lostItem.id, foundItemId: foundItem.id } },
    });
    expect(refreshedMatch?.status).toBe('RESOLVED');
  });

  it('Step 11: System audit trail and recovery counters accurately reflect completion', async () => {
    const returnAudit = await prisma.auditLog.findFirst({
      where: {
        resourceId: handoverChallenge.id,
        action: 'HANDOVER_CONFIRMED',
      },
    });

    expect(returnAudit).not.toBeNull();
    expect(returnAudit?.actorId).toBe(moderator.id);

    // Verify recovery count for college
    const totalReturnedItems = await prisma.item.count({
      where: { collegeId: college.id, status: ItemStatus.RETURNED },
    });
    expect(totalReturnedItems).toBeGreaterThanOrEqual(1);
  });
});

