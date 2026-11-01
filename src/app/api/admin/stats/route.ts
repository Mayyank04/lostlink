import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ItemReportType, ItemStatus, MembershipStatus, UserRole } from '@prisma/client';

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

    const whereCollege = collegeId && collegeId !== 'all' ? { collegeId } : {};

    const [
      lostCount,
      foundCount,
      returnedCount,
      pendingClaimsCount,
      membersCount,
      matchesCount,
    ] = await Promise.all([
      prisma.item.count({
        where: { ...whereCollege, type: ItemReportType.LOST },
      }),
      prisma.item.count({
        where: { ...whereCollege, type: ItemReportType.FOUND },
      }),
      prisma.item.count({
        where: { ...whereCollege, status: ItemStatus.RETURNED },
      }),
      prisma.claim.count({
        where: {
          status: 'PENDING',
          ...(collegeId && collegeId !== 'all' ? { item: { collegeId } } : {}),
        },
      }),
      prisma.collegeMembership.count({
        where: { ...whereCollege, status: MembershipStatus.VERIFIED },
      }),
      prisma.match.count({
        where: {
          status: { not: 'DISMISSED' },
          ...(collegeId && collegeId !== 'all' ? { lostItem: { collegeId } } : {}),
        },
      }),
    ]);

    const recoveryRate = foundCount > 0 ? Math.round((returnedCount / foundCount) * 100) : 0;

    return NextResponse.json({
      analytics: {
        collegeId: collegeId || 'all',
        totalLostReports: lostCount,
        totalFoundReports: foundCount,
        activeMatchesCount: matchesCount,
        pendingClaimsCount,
        successfulReturnsCount: returnedCount,
        verifiedMembersCount: membersCount,
        recoveryRatePercent: recoveryRate,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
