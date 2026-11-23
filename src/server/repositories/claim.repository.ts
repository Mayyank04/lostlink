import { prisma } from '@/lib/db';
import { Claim, ClaimStatus, Prisma } from '@prisma/client';

export interface ClaimFilters {
  collegeId?: string;
  claimantId?: string;
  itemId?: string;
  status?: ClaimStatus;
  skip?: number;
  limit?: number;
}

export const claimRepository = {
  buildWhereClause(filters: ClaimFilters): Prisma.ClaimWhereInput {
    const where: Prisma.ClaimWhereInput = {};
    if (filters.claimantId) where.claimantId = filters.claimantId;
    if (filters.itemId) where.itemId = filters.itemId;
    if (filters.status) where.status = filters.status;
    if (filters.collegeId) {
      where.item = { collegeId: filters.collegeId };
    }
    return where;
  },

  async findMany(filters: ClaimFilters) {
    const where = this.buildWhereClause(filters);
    const skip = filters.skip || 0;
    const take = filters.limit || 20;

    return prisma.claim.findMany({
      where,
      include: {
        item: {
          include: {
            college: { select: { id: true, name: true, slug: true } },
            campus: { select: { id: true, name: true, code: true } },
          },
        },
        claimant: { select: { id: true, name: true, email: true } },
        handoverChallenges: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  async count(filters: ClaimFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.claim.count({ where });
  },

  async findById(id: string) {
    return prisma.claim.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            college: true,
            campus: true,
            reporter: { select: { id: true, name: true, email: true } },
          },
        },
        claimant: { select: { id: true, name: true, email: true } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        handoverChallenges: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  async create(data: Prisma.ClaimCreateInput): Promise<Claim> {
    return prisma.claim.create({ data });
  },

  async update(id: string, data: Prisma.ClaimUpdateInput): Promise<Claim> {
    return prisma.claim.update({ where: { id }, data });
  },
};
