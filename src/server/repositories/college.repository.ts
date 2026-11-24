import { prisma } from '@/lib/db';
import { College, CollegeStatus, DomainStatus, Prisma } from '@prisma/client';

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
        { domains: { some: { domain: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const skip = filters.skip || 0;
    const take = filters.limit || 20;

    return prisma.college.findMany({
      where,
      include: {
        campuses: true,
        domains: true,
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
        { domains: { some: { domain: { contains: s, mode: 'insensitive' } } } },
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
        domains: true,
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
        domains: true,
      },
    });
  },

  async findByDomain(domain: string) {
    const normalized = domain.toLowerCase().trim();
    // Check relational CollegeEmailDomain first
    const domainRecord = await prisma.collegeEmailDomain.findUnique({
      where: { domain: normalized },
      include: {
        college: {
          include: {
            campuses: true,
            domains: true,
          },
        },
      },
    });

    if (domainRecord) return domainRecord.college;

    return prisma.college.findFirst({
      where: { emailDomains: { has: normalized } },
      include: {
        campuses: true,
        domains: true,
      },
    });
  },

  async addDomain(
    collegeId: string,
    domain: string,
    verificationStatus: DomainStatus = DomainStatus.VERIFIED,
    verificationSource?: string,
    isPrimary: boolean = false
  ) {
    const normalized = domain.toLowerCase().trim();
    return prisma.collegeEmailDomain.upsert({
      where: { domain: normalized },
      update: {
        verificationStatus,
        verificationSource,
        isPrimary,
        collegeId,
      },
      create: {
        collegeId,
        domain: normalized,
        verificationStatus,
        verificationSource,
        isPrimary,
      },
    });
  },

  async updateDomainStatus(domainId: string, verificationStatus: DomainStatus) {
    return prisma.collegeEmailDomain.update({
      where: { id: domainId },
      data: {
        verificationStatus,
        verifiedAt: verificationStatus === DomainStatus.VERIFIED ? new Date() : null,
      },
    });
  },

  async create(data: Prisma.CollegeCreateInput): Promise<College> {
    return prisma.college.create({ data });
  },

  async update(id: string, data: Prisma.CollegeUpdateInput): Promise<College> {
    return prisma.college.update({ where: { id }, data });
  },
};
