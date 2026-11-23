import { prisma } from '@/lib/db';
import { College, CollegeStatus, Prisma } from '@prisma/client';

export interface CollegeFilters {
  search?: string;
  state?: string;
  status?: CollegeStatus;
  skip?: number;
  limit?: number;
}

export const collegeRepository = {
  async findMany(filters: CollegeFilters) {
    const where: Prisma.CollegeWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.state) where.state = filters.state;
    if (filters.search && filters.search.trim().length > 0) {
      const s = filters.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { emailDomains: { has: s } },
      ];
    }

    const skip = filters.skip || 0;
    const take = filters.limit || 20;

    return prisma.college.findMany({
      where,
      include: {
        campuses: true,
        _count: {
          select: {
            items: true,
            memberships: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    });
  },

  async count(filters: CollegeFilters): Promise<number> {
    const where: Prisma.CollegeWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.state) where.state = filters.state;
    if (filters.search && filters.search.trim().length > 0) {
      const s = filters.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { emailDomains: { has: s } },
      ];
    }
    return prisma.college.count({ where });
  },

  async findById(id: string) {
    return prisma.college.findUnique({
      where: { id },
      include: {
        campuses: {
          include: {
            locations: true,
          },
        },
        _count: {
          select: { items: true, memberships: true },
        },
      },
    });
  },

  async findBySlug(slug: string) {
    return prisma.college.findUnique({
      where: { slug },
      include: {
        campuses: true,
      },
    });
  },

  async findByDomain(domain: string) {
    return prisma.college.findFirst({
      where: { emailDomains: { has: domain.toLowerCase().trim() } },
    });
  },

  async create(data: Prisma.CollegeCreateInput): Promise<College> {
    return prisma.college.create({ data });
  },

  async update(id: string, data: Prisma.CollegeUpdateInput): Promise<College> {
    return prisma.college.update({ where: { id }, data });
  },
};
