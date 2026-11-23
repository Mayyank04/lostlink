import { prisma } from '@/lib/db';
import { HandoverChallenge, HandoverStatus, Prisma } from '@prisma/client';

export const handoverRepository = {
  async createChallenge(data: Prisma.HandoverChallengeCreateInput): Promise<HandoverChallenge> {
    return prisma.handoverChallenge.create({ data });
  },

  async findById(id: string) {
    return prisma.handoverChallenge.findUnique({
      where: { id },
      include: {
        claim: {
          include: {
            item: true,
            claimant: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  },

  async findActiveByClaimId(claimId: string) {
    return prisma.handoverChallenge.findFirst({
      where: {
        claimId,
        status: HandoverStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async update(id: string, data: Prisma.HandoverChallengeUpdateInput): Promise<HandoverChallenge> {
    return prisma.handoverChallenge.update({ where: { id }, data });
  },
};
