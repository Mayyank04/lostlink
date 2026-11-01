import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { ItemReportType, ItemStatus, ClaimStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user = await getCurrentUser(req);
    const requestedCollegeId = searchParams.get('collegeId');

    const collegeId =
      requestedCollegeId ||
      user?.memberships[0]?.collegeId ||
      undefined;

    const baseWhere: any = collegeId ? { collegeId } : {};

    const [
      lostCount,
      foundCount,
      returnedCount,
      matchesCount,
      myReportsCount,
      myPendingClaimsCount,
    ] = await Promise.all([
      prisma.item.count({
        where: {
          ...baseWhere,
          type: ItemReportType.LOST,
          status: ItemStatus.OPEN,
        },
      }),
      prisma.item.count({
        where: {
          ...baseWhere,
          type: ItemReportType.FOUND,
          status: ItemStatus.OPEN,
        },
      }),
      prisma.item.count({
        where: {
          ...baseWhere,
          status: ItemStatus.RETURNED,
        },
      }),
      prisma.match.count({
        where: {
          status: { not: 'DISMISSED' },
          ...(collegeId
            ? {
                lostItem: { collegeId },
              }
            : {}),
        },
      }),
      user
        ? prisma.item.count({
            where: { reporterId: user.id },
          })
        : 0,
      user
        ? prisma.claim.count({
            where: { claimantId: user.id, status: ClaimStatus.PENDING },
          })
        : 0,
    ]);

    return NextResponse.json({
      stats: {
        lostCount,
        foundCount,
        returnedCount,
        matchesCount,
        myReportsCount,
        myPendingClaimsCount,
      },
      collegeId: collegeId || null,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard statistics' }, { status: 500 });
  }
}
