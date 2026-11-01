import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JobStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [workers, totalJobs, queuedJobs, leasedJobs, completedJobs, failedJobs] =
      await Promise.all([
        prisma.campusWorkerKey.findMany({
          select: {
            id: true,
            workerId: true,
            name: true,
            collegeId: true,
            status: true,
            lastHeartbeatAt: true,
            lastIpAddress: true,
            metrics: true,
            createdAt: true,
            college: { select: { name: true, slug: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.matchingJob.count(),
        prisma.matchingJob.count({ where: { status: JobStatus.QUEUED } }),
        prisma.matchingJob.count({ where: { status: JobStatus.LEASED } }),
        prisma.matchingJob.count({ where: { status: JobStatus.COMPLETED } }),
        prisma.matchingJob.count({ where: { status: JobStatus.FAILED } }),
      ]);

    const activeWorkers = workers.map((w) => {
      let parsedMetrics: any = null;
      try {
        if (w.metrics) parsedMetrics = JSON.parse(w.metrics);
      } catch {}

      // Consider worker actively online if heartbeat received in the last 60 seconds
      const isOnline =
        w.lastHeartbeatAt !== null &&
        Date.now() - new Date(w.lastHeartbeatAt).getTime() < 60000;

      return {
        workerId: w.workerId,
        name: w.name,
        college: w.college?.name || 'All Colleges (Global)',
        status: w.status,
        isOnline,
        lastHeartbeat: w.lastHeartbeatAt,
        lastIpAddress: w.lastIpAddress,
        metrics: parsedMetrics,
      };
    });

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        summary: {
          totalRegisteredWorkers: workers.length,
          activeOnlineWorkers: activeWorkers.filter((w) => w.isOnline).length,
          queueMetrics: {
            totalJobs,
            queued: queuedJobs,
            leased: leasedJobs,
            completed: completedJobs,
            failed: failedJobs,
          },
        },
        workers: activeWorkers,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API:Hybrid:Status] Failed to retrieve hybrid cluster status:', error);
    return NextResponse.json(
      { error: 'Internal server error retrieving hybrid cluster status' },
      { status: 500 }
    );
  }
}

