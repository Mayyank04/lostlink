import { collegeRepository, CollegeFilters } from '../repositories/college.repository';
import { NotFoundError, ConflictError } from '@/lib/errors';
import { CollegeStatus, Prisma } from '@prisma/client';

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
};
