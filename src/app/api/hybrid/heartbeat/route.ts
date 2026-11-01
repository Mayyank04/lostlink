import { NextResponse } from 'next/server';
import { validateCampusWorkerRequest } from '@/lib/hybrid/auth';
import { prisma } from '@/lib/db';
import { JobStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await validateCampusWorkerRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { worker } = auth;
    let metrics: any = null;
    try {
      metrics = await request.json();
    } catch {
      metrics = {};
    }

    // Persist worker metrics snapshot
    await prisma.campusWorkerKey.update({
      where: { id: worker.id },
      data: {
        lastHeartbeatAt: new Date(),
        metrics: JSON.stringify(metrics),
      },
    });

    // Count pending work in queue
    const [queuedJobsCount, activeLeasedCount] = await Promise.all([
      prisma.matchingJob.count({
        where: {
          status: JobStatus.QUEUED,
          ...(worker.collegeId ? { collegeId: worker.collegeId } : {}),
        },
      }),
      prisma.matchingJob.count({
        where: {
          status: JobStatus.LEASED,
          assignedWorkerId: worker.workerId,
        },
      }),
    ]);

    return NextResponse.json(
      {
        status: 'acknowledged',
        workerId: worker.workerId,
        serverTimestamp: new Date().toISOString(),
        queueStatus: {
          queuedJobs: queuedJobsCount,
          activeLeasedJobs: activeLeasedCount,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API:Hybrid:Heartbeat] Heartbeat processing failed:', error);
    return NextResponse.json(
      { error: 'Internal server error processing worker heartbeat' },
      { status: 500 }
    );
  }
}
