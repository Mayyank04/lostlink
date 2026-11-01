import { NextResponse } from 'next/server';
import { validateCampusWorkerRequest } from '@/lib/hybrid/auth';
import { completeMatchingJob } from '@/lib/hybrid/queue';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const completeJobSchema = z.object({
  matches: z.array(
    z.object({
      lostItemId: z.string(),
      foundItemId: z.string(),
      totalScore: z.number().min(0).max(100),
      confidenceTier: z.string(),
      matchingAttributes: z.array(z.string()),
      safeExplanation: z.string(),
      breakdown: z.record(z.string(), z.any()),
    })
  ),
  executionTimeMs: z.number().nonnegative(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateCampusWorkerRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { worker } = auth;
    const body = await request.json();
    const parseResult = completeJobSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid completion payload', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const result = await completeMatchingJob(params.id, worker.workerId, {
      matches: parseResult.data.matches,
      executionTimeMs: parseResult.data.executionTimeMs,
      workerId: worker.workerId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json(
      {
        success: true,
        jobId: params.id,
        matchesRecorded: result.matchesRecorded,
        completedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API:Hybrid:Complete] Error completing job:', error);
    return NextResponse.json(
      { error: 'Internal server error while completing matching job' },
      { status: 500 }
    );
  }
}
