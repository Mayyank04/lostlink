import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireCollegeAdmin, errorResponse, AuthError } from '@/lib/auth/tenant';
import { MembershipStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    let collegeId = searchParams.get('collegeId');
    if (user.role !== 'PLATFORM_ADMIN' || !collegeId) {
      const membership = user.memberships.find((m) => m.status === MembershipStatus.VERIFIED) || user.memberships[0];
      if (!membership) {
        throw new AuthError('No college association found for this administrator', 403);
      }
      collegeId = membership.collegeId;
    }

    requireCollegeAdmin(user, collegeId);

    const status = searchParams.get('status') as MembershipStatus | null;
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = { collegeId };

    if (status && Object.values(MembershipStatus).includes(status)) {
      where.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { studentIdentifier: { contains: term, mode: 'insensitive' } },
        { user: { name: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, students] = await Promise.all([
      prisma.collegeMembership.count({ where }),
      prisma.collegeMembership.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      collegeId,
      students: students.map((m) => ({
        membershipId: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.user.role,
        userStatus: m.user.status,
        avatarUrl: m.user.avatarUrl,
        membershipStatus: m.status,
        studentIdentifier: m.studentIdentifier,
        verifiedAt: m.verifiedAt,
        createdAt: m.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
