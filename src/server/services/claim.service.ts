import { claimRepository, ClaimFilters } from '../repositories/claim.repository';
import { itemRepository } from '../repositories/item.repository';
import { AuthenticatedUser } from '@/lib/auth/session';
import { requireCollegeMembership, requireCollegeAdmin } from '@/lib/auth/tenant';
import { NotFoundError, AuthorizationError, ConflictError, ValidationError } from '@/lib/errors';
import { ClaimStatus, ItemStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

export interface SubmitClaimInput {
  itemId: string;
  verificationNotes: string;
  linkedLostItemId?: string | null;
  evidenceDetails?: Record<string, any>;
  evidenceFileUrl?: string | null;
}

export const claimService = {
  async getClaims(user: AuthenticatedUser, filters: ClaimFilters) {
    if (user.role === 'STUDENT') {
      filters.claimantId = user.id;
    }

    const [claims, total] = await Promise.all([
      claimRepository.findMany(filters),
      claimRepository.count(filters),
    ]);
    return { claims, total };
  },

  async getClaimById(user: AuthenticatedUser, id: string) {
    const claim = await claimRepository.findById(id);
    if (!claim) {
      throw new NotFoundError('Claim not found');
    }

    const isClaimant = claim.claimantId === user.id;
    const isReporter = claim.item.reporterId === user.id;
    const isAdmin = user.role === 'PLATFORM_ADMIN' || user.role === 'COLLEGE_ADMIN';

    if (!isClaimant && !isReporter && !isAdmin) {
      throw new AuthorizationError('Unauthorized to inspect this claim');
    }

    return claim;
  },

  async submitClaim(user: AuthenticatedUser, input: SubmitClaimInput) {
    const item = await prisma.item.findUnique({
      where: { id: input.itemId },
      include: { reporter: true },
    });
    if (!item) {
      throw new NotFoundError('Item not found');
    }

    if (item.reporterId === user.id) {
      throw new ValidationError('Self-claim prohibited: You cannot claim an item you reported found yourself.');
    }

    if (item.status === ItemStatus.RETURNED || item.status === ItemStatus.CLOSED) {
      throw new ValidationError('This item has already been marked as returned or closed.');
    }

    const existingActiveClaim = await prisma.claim.findFirst({
      where: {
        itemId: input.itemId,
        claimantId: user.id,
        status: { in: [ClaimStatus.PENDING, ClaimStatus.UNDER_REVIEW, ClaimStatus.APPROVED, ClaimStatus.HANDOVER_PENDING] },
      },
    });

    if (existingActiveClaim) {
      throw new ConflictError('You already have an active claim pending review for this item.');
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const referenceNumber = `CLM-${new Date().getFullYear()}-${randomSuffix}`;

    return prisma.$transaction(async (tx) => {
      const claim = await tx.claim.create({
        data: {
          referenceNumber,
          itemId: input.itemId,
          claimantId: user.id,
          linkedLostItemId: input.linkedLostItemId || null,
          additionalProofNotes: input.verificationNotes,
          privateEvidenceReference: JSON.stringify(input.evidenceDetails || {}),
          status: ClaimStatus.PENDING,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: ClaimStatus.PENDING,
          toStatus: ClaimStatus.PENDING,
          actorId: user.id,
          notes: 'Claim initiated by student with private ownership evidence.',
        },
      });

      await tx.item.update({
        where: { id: input.itemId },
        data: { status: ItemStatus.CLAIM_PENDING },
      });

      await tx.notification.create({
        data: {
          userId: item.reporterId,
          type: 'claim_received',
          title: 'Ownership Claim Submitted',
          message: `${user.name} submitted an ownership claim for "${item.name}". Please review verification evidence.`,
          resourceId: claim.id,
          linkUrl: `/claims/${claim.id}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'claim_received',
          title: `Claim Submitted (${referenceNumber})`,
          message: `Your ownership claim for "${item.name}" has been logged and is awaiting moderation review.`,
          resourceId: claim.id,
          linkUrl: `/claims/${claim.id}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: item.collegeId,
          action: 'CREATE_CLAIM',
          resourceType: 'CLAIM',
          resourceId: claim.id,
          metadata: JSON.stringify({ itemId: input.itemId, referenceNumber }),
        },
      });

      return claim;
    });
  },

  async reviewClaim(
    user: AuthenticatedUser,
    claimId: string,
    decision: { status: 'APPROVED' | 'REJECTED'; reviewNotes?: string }
  ) {
    const claim = await claimRepository.findById(claimId);
    if (!claim) {
      throw new NotFoundError('Claim not found');
    }

    const isFinder = claim.item.reporterId === user.id;
    const isCollegeAdmin = user.role === 'PLATFORM_ADMIN' || user.role === 'COLLEGE_ADMIN';

    if (!isFinder && !isCollegeAdmin) {
      throw new AuthorizationError('Only the finder or campus administrator can review claims.');
    }

    const newClaimStatus = decision.status === 'APPROVED' ? ClaimStatus.APPROVED : ClaimStatus.REJECTED;
    const newItemStatus = decision.status === 'APPROVED' ? ItemStatus.CLAIM_PENDING : ItemStatus.OPEN;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.claim.update({
        where: { id: claimId },
        data: {
          status: newClaimStatus,
          statusHistory: {
            create: {
              fromStatus: claim.status,
              toStatus: newClaimStatus,
              actorId: user.id,
              notes: decision.reviewNotes || `Claim ${decision.status.toLowerCase()} by reviewer.`,
            },
          },
        },
      });

      await tx.item.update({
        where: { id: claim.itemId },
        data: { status: newItemStatus },
      });

      await tx.notification.create({
        data: {
          userId: claim.claimantId,
          type: decision.status === 'APPROVED' ? 'claim_approved' : 'claim_rejected',
          title: `Claim ${decision.status === 'APPROVED' ? 'Approved' : 'Declined'}`,
          message: decision.reviewNotes || `Your claim for "${claim.item.name}" was ${decision.status.toLowerCase()}.`,
          resourceId: claim.id,
          linkUrl: `/claims/${claim.id}`,
        },
      });

      return updated;
    });
  },
};
