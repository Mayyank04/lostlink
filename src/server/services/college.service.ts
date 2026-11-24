import { collegeRepository, CollegeFilters } from '../repositories/college.repository';
import { NotFoundError, ConflictError } from '@/lib/errors';
import { CollegeStatus, DomainStatus, Prisma } from '@prisma/client';

export const collegeService = {
  async getColleges(filters: CollegeFilters) {
    const [colleges, total] = await Promise.all([
      collegeRepository.findMany(filters),
      collegeRepository.count(filters),
    ]);
    return { colleges, total };
  },

  async getCollegeById(id: string) {
    const college = await collegeRepository.findById(id);
    if (!college) {
      throw new NotFoundError('College not found');
    }
    return college;
  },

  async searchColleges(query: string, state?: string, limit = 20) {
    return collegeRepository.findMany({
      search: query,
      state,
      limit,
    });
  },

  async addDomain(
    collegeId: string,
    domain: string,
    verificationStatus: DomainStatus = DomainStatus.VERIFIED,
    verificationSource?: string,
    isPrimary: boolean = false
  ) {
    const college = await collegeRepository.findById(collegeId);
    if (!college) throw new NotFoundError('College not found');

    const result = await collegeRepository.addDomain(
      collegeId,
      domain,
      verificationStatus,
      verificationSource,
      isPrimary
    );

    // Keep emailDomains array synced on College for backward compatibility
    const normalized = domain.toLowerCase().trim();
    if (!college.emailDomains.includes(normalized)) {
      await collegeRepository.update(collegeId, {
        emailDomains: [...college.emailDomains, normalized],
      });
    }

    return result;
  },

  async updateDomainVerification(domainId: string, status: DomainStatus) {
    return collegeRepository.updateDomainStatus(domainId, status);
  },
};
