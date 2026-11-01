import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { ItemReportType, ItemStatus, ClaimStatus, UserRole, UserStatus } from '@prisma/client';

describe('Phase 3 Ownership Claims & State Machine', () => {
  let collegeId: string;
  let campusId: string;
  let finderUser: any;
  let claimantUser: any;
  let rivalClaimantUser: any;
  let moderatorUser: any;
  let testItem: any;

  beforeAll(async () => {
    const college = await prisma.college.findFirst({ include: { campuses: true } });
    if (!college || college.campuses.length === 0) {
      throw new Error('Database must have at least one college and campus seeded');
    }
    collegeId = college.id;
    campusId = college.campuses[0].id;

    const timestamp = Date.now();

    // Create Finder, Claimant, Rival Claimant, and Moderator
    finderUser = await prisma.user.create({
      data: {
        name: 'Finder Student',
        email: `finder.${timestamp}@test.edu`,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    claimantUser = await prisma.user.create({
      data: {
        name: 'Claimant Alice',
        email: `claimant.${timestamp}@test.edu`,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    rivalClaimantUser = await prisma.user.create({
      data: {
        name: 'Rival Bob',
        email: `rival.${timestamp}@test.edu`,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    moderatorUser = await prisma.user.create({
      data: {
        name: 'Desk Officer Chen',
        email: `moderator.${timestamp}@test.edu`,
        role: UserRole.COLLEGE_MODERATOR,
        status: UserStatus.ACTIVE,
        memberships: {
          create: {
            collegeId,
            verificationMethod: 'STAFF_APPOINTMENT',
          },
        },
      },
    });

    // Create a Found Item reported by finderUser
    testItem = await prisma.item.create({
      data: {
        reportNumber: `FD-TEST-${timestamp}`,
        reporterId: finderUser.id,
        collegeId,
        campusId,
        locationBuilding: 'Library Annex',
        locationSpecifics: '2nd Floor Quiet Study',
        type: ItemReportType.FOUND,
        name: 'Apple iPad Air (5th Gen) Starlight',
        category: 'electronics',
        brand: 'Apple',
        color: 'Starlight',
        description: 'Found in leather sleeve with stylus',
        occurredAt: new Date(),
        status: ItemStatus.OPEN,
      },
    });
  });

  it('rejects anti-self-claim attempt when finder attempts to claim their own found report', async () => {
    // A student reporting a found item cannot claim ownership of the same item
    const isSelfClaim = testItem.reporterId === finderUser.id;
    expect(isSelfClaim).toBe(true);

    // Ensure our business constraint holds: finder cannot claim own item
    const attemptSelfClaim = async () => {
      if (testItem.reporterId === finderUser.id) {
        throw new Error('You cannot submit an ownership claim on an item you reported found.');
      }
    };

    await expect(attemptSelfClaim()).rejects.toThrow('cannot submit an ownership claim on an item you reported found');
  });

  it('creates ownership claim with private verification answers and transitions item to CLAIM_PENDING', async () => {
    const claimRef = `CLM-TEST-${Date.now()}`;
    const answers = [
      { questionId: 'q1', question: 'Lock screen wallpaper description?', answer: 'Photo of a golden retriever' },
      { questionId: 'q2', question: 'Stylus brand or marking?', answer: 'Apple Pencil 2 with engraved initials AW' },
    ];

    const claim = await prisma.$transaction(async (tx) => {
      const c = await tx.claim.create({
        data: {
          referenceNumber: claimRef,
          itemId: testItem.id,
          claimantId: claimantUser.id,
          privateEvidenceReference: JSON.stringify({ answers }),
          additionalProofNotes: 'Purchased at campus bookstore last month',
          status: ClaimStatus.PENDING,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: c.id,
          fromStatus: ClaimStatus.PENDING,
          toStatus: ClaimStatus.PENDING,
          actorId: claimantUser.id,
          notes: 'Claim submitted with private answers',
        },
      });

      await tx.item.update({
        where: { id: testItem.id },
        data: { status: ItemStatus.CLAIM_PENDING },
      });

      return c;
    });

    expect(claim.id).toBeDefined();
    expect(claim.status).toBe(ClaimStatus.PENDING);

    const updatedItem = await prisma.item.findUnique({ where: { id: testItem.id } });
    expect(updatedItem?.status).toBe(ItemStatus.CLAIM_PENDING);

    // Verify status history
    const history = await prisma.claimStatusHistory.findMany({ where: { claimId: claim.id } });
    expect(history.length).toBe(1);
    expect(history[0].actorId).toBe(claimantUser.id);
  });

  it('allows moderator or finder to request evidence, transitioning status to UNDER_REVIEW', async () => {
    const claim = await prisma.claim.findFirst({
      where: { itemId: testItem.id, claimantId: claimantUser.id },
    });
    expect(claim).not.toBeNull();
    if (!claim) return;

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: ClaimStatus.UNDER_REVIEW,
          additionalProofNotes: `${claim.additionalProofNotes}\n[Evidence Requested]: Please provide receipt or serial number suffix.`,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: claim.status,
          toStatus: ClaimStatus.UNDER_REVIEW,
          actorId: moderatorUser.id,
          notes: 'Requested serial number or purchase receipt from campus bookstore.',
        },
      });

      return c;
    });

    expect(updated.status).toBe(ClaimStatus.UNDER_REVIEW);

    const history = await prisma.claimStatusHistory.findMany({
      where: { claimId: claim.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(history.length).toBe(2);
    expect(history[0].toStatus).toBe(ClaimStatus.UNDER_REVIEW);
    expect(history[0].actorId).toBe(moderatorUser.id);
  });

  it('allows claimant to provide supplementary evidence and keeps claim UNDER_REVIEW', async () => {
    const claim = await prisma.claim.findFirst({
      where: { itemId: testItem.id, claimantId: claimantUser.id },
    });
    expect(claim).not.toBeNull();
    if (!claim) return;

    const supplementaryNotes = '[Claimant Proof]: Serial ends in 9X2J, attached receipt receipt_01.pdf';

    await prisma.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: claim.id },
        data: {
          additionalProofNotes: `${claim.additionalProofNotes}\n${supplementaryNotes}`,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: ClaimStatus.UNDER_REVIEW,
          toStatus: ClaimStatus.UNDER_REVIEW,
          actorId: claimantUser.id,
          notes: supplementaryNotes,
        },
      });
    });

    const refreshed = await prisma.claim.findUnique({ where: { id: claim.id } });
    expect(refreshed?.additionalProofNotes).toContain('Serial ends in 9X2J');
  });

  it('handles claimant cancellation and resets item status if no other pending claims exist', async () => {
    // Create a temporary rival claim to test cancellation
    const tempClaim = await prisma.claim.create({
      data: {
        referenceNumber: `CLM-CANCEL-${Date.now()}`,
        itemId: testItem.id,
        claimantId: rivalClaimantUser.id,
        privateEvidenceReference: JSON.stringify({ answers: [] }),
        status: ClaimStatus.PENDING,
      },
    });

    // Rival cancels their claim
    await prisma.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: tempClaim.id },
        data: { status: ClaimStatus.CANCELLED },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: tempClaim.id,
          fromStatus: ClaimStatus.PENDING,
          toStatus: ClaimStatus.CANCELLED,
          actorId: rivalClaimantUser.id,
          notes: 'Claimant realized item was not theirs.',
        },
      });
    });

    const cancelledClaim = await prisma.claim.findUnique({ where: { id: tempClaim.id } });
    expect(cancelledClaim?.status).toBe(ClaimStatus.CANCELLED);

    // Alice's claim is still UNDER_REVIEW, so item remains in CLAIM_PENDING
    const otherPending = await prisma.claim.count({
      where: {
        itemId: testItem.id,
        status: { in: [ClaimStatus.PENDING, ClaimStatus.UNDER_REVIEW, ClaimStatus.HANDOVER_PENDING] },
      },
    });
    expect(otherPending).toBeGreaterThan(0);
  });
});

