import { prisma } from '@/lib/db';
import { Item, ItemReportType, ItemStatus, Prisma } from '@prisma/client';

export interface ItemFilters {
  type?: ItemReportType;
  collegeId?: string;
  campusId?: string;
  category?: string;
  status?: ItemStatus | 'ALL';
  search?: string;
  skip?: number;
  limit?: number;
}

export const itemRepository = {
  buildWhereClause(filters: ItemFilters): Prisma.ItemWhereInput {
    const where: Prisma.ItemWhereInput = {
      isArchived: false,
    };

    if (filters.type) where.type = filters.type;
    if (filters.collegeId && filters.collegeId !== 'all') where.collegeId = filters.collegeId;
    if (filters.campusId && filters.campusId !== 'all') where.campusId = filters.campusId;
    if (filters.category && filters.category !== 'All' && filters.category !== 'all') {
      where.category = filters.category;
    }

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    } else if (!filters.status) {
      where.status = { not: ItemStatus.CLOSED };
    }

    if (filters.search && filters.search.trim().length > 0) {
      const s = filters.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { brand: { contains: s, mode: 'insensitive' } },
        { color: { contains: s, mode: 'insensitive' } },
        { locationBuilding: { contains: s, mode: 'insensitive' } },
      ];
    }

    return where;
  },

  async findMany(filters: ItemFilters) {
    const where = this.buildWhereClause(filters);
    const skip = filters.skip || 0;
    const take = filters.limit || 20;

    return prisma.item.findMany({
      where,
      include: {
        college: { select: { id: true, name: true, slug: true } },
        campus: { select: { id: true, name: true, code: true } },
        reporter: { select: { id: true, name: true } },
        images: { select: { id: true, url: true, visibility: true } },
        _count: { select: { claims: true, lostMatches: true, foundMatches: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  async count(filters: ItemFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.item.count({ where });
  },

  async findById(id: string) {
    return prisma.item.findUnique({
      where: { id },
      include: {
        college: true,
        campus: true,
        reporter: { select: { id: true, name: true, email: true } },
        images: true,
        claims: {
          include: {
            claimant: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  async create(data: Prisma.ItemCreateInput): Promise<Item> {
    return prisma.item.create({ data });
  },

  async update(id: string, data: Prisma.ItemUpdateInput): Promise<Item> {
    return prisma.item.update({ where: { id }, data });
  },

  async archive(id: string): Promise<Item> {
    return prisma.item.update({
      where: { id },
      data: { isArchived: true, status: ItemStatus.CLOSED },
    });
  },
};
