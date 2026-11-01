import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const collegeId = searchParams.get('collegeId') || user.memberships[0]?.collegeId;

    const isPlatformAdmin = user.role === UserRole.PLATFORM_ADMIN;
    const isCollegeAdmin = user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR;

    if (!isPlatformAdmin && !isCollegeAdmin) {
      return NextResponse.json(
        { error: 'Administrative privileges required' },
        { status: 403 }
      );
    }

    const memberships = await prisma.collegeMembership.findMany({
      where: {
        ...(collegeId && collegeId !== 'all' ? { collegeId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true, role: true } },
        college: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      memberships: memberships.map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.name,
        userEmail: m.user.email,
        collegeId: m.collegeId,
        collegeName: m.college.name,
        role: m.user.role,
        status: m.status,
        studentIdentifier: m.studentIdentifier,
        verifiedAt: m.verifiedAt?.toISOString() || null,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
