import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { ItemReportType, ItemStatus, ClaimStatus, UserStatus, CollegeStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const [
      totalColleges,
      activeColleges,
      pendingColleges,
      registeredStudents,
      verifiedStudents,
      lostReports,
      foundReports,
      activeMatches,
      pendingClaims,
      returnedItems,
      suspendedAccounts,
      totalWorkers,
      activeWorkers,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.college.count(),
      prisma.college.count({ where: { status: CollegeStatus.ACTIVE, isArchived: false } }),
      prisma.college.count({ where: { status: CollegeStatus.PENDING } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.collegeMembership.count({ where: { status: 'VERIFIED' } }),
      prisma.item.count({ where: { type: ItemReportType.LOST } }),
      prisma.item.count({ where: { type: ItemReportType.FOUND } }),
      prisma.match.count(),
      prisma.claim.count({
        where: { status: { in: [ClaimStatus.PENDING, ClaimStatus.UNDER_REVIEW] } },
      }),
      prisma.item.count({ where: { status: ItemStatus.RETURNED } }),
      prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
      prisma.campusWorkerKey.count(),
      prisma.campusWorkerKey.count({ where: { status: 'ACTIVE' } }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
          college: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);

    const queueMetrics = await prisma.matchingJob.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const queueCounts = {
      QUEUED: 0,
      LEASED: 0,
      COMPLETED: 0,
      FAILED: 0,
    };
    for (const q of queueMetrics) {
      if (q.status in queueCounts) {
        queueCounts[q.status as keyof typeof queueCounts] = q._count._all;
      }
    }

    return NextResponse.json({
      summary: {
        totalColleges,
        activeColleges,
        pendingColleges,
        registeredStudents,
        verifiedStudents,
        lostReports,
        foundReports,
        activeMatches,
        pendingClaims,
        returnedItems,
        suspendedAccounts,
        totalWorkers,
        activeWorkers,
      },
      queue: queueCounts,
      recentActivity: recentAuditLogs,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

