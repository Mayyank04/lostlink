import { NextResponse } from 'next/server';
import { validateCampusWorkerRequest } from '@/lib/hybrid/auth';
import { leaseMatchingJob } from '@/lib/hybrid/queue';
import { WorkerType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await validateCampusWorkerRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { worker } = auth;
    const leasedJob = await leaseMatchingJob(
      worker.workerId,
      worker.collegeId,
      WorkerType.CAMPUS
    );

    if (!leasedJob) {
      return NextResponse.json(
        {
          status: 'idle',
          message: 'No pending matching jobs available for lease.',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: 'leased',
        job: leasedJob,
        worker: {
          workerId: worker.workerId,
          collegeId: worker.collegeId,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API:Hybrid:Lease] Error leasing job:', error);
    return NextResponse.json(
      { error: 'Internal server error while leasing job' },
      { status: 500 }
    );
  }
}
