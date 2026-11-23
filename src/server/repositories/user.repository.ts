import { prisma } from '@/lib/db';
import { User, MembershipStatus, UserRole, UserStatus, Prisma } from '@prisma/client';

export const userRepository = {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            college: true,
          },
        },
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        memberships: {
          include: {
            college: true,
          },
        },
      },
    });
  },

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  async updateMembershipStatus(membershipId: string, status: MembershipStatus) {
    return prisma.collegeMembership.update({
      where: { id: membershipId },
      data: {
        status,
        verifiedAt: status === MembershipStatus.VERIFIED ? new Date() : null,
      },
    });
  },

  async findStudentsByCollege(collegeId: string) {
    return prisma.collegeMembership.findMany({
      where: { collegeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
