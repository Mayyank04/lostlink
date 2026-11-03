import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const [workers, jobs, queueSummary] = await Promise.all([
      prisma.campusWorkerKey.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { college: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.matchingJob.findMany({
        take: 25,
        orderBy: { createdAt: 'desc' },
        include: {
          college: { select: { id: true, name: true, slug: true } },
          item: { select: { id: true, name: true, reportNumber: true } },
        },
      }),
      prisma.matchingJob.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      workers,
      recentJobs: jobs,
      queueSummary,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

