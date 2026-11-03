import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

    const mem = process.memoryUsage();
    const memory = {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      externalMb: Math.round(mem.external / 1024 / 1024),
    };

    const [activeWorkers, totalWorkers, totalJobs] = await Promise.all([
      prisma.campusWorkerKey.count({ where: { status: 'ACTIVE' } }),
      prisma.campusWorkerKey.count(),
      prisma.matchingJob.count(),
    ]);

    return NextResponse.json({
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      database: {
        status: 'CONNECTED',
        latencyMs: dbLatencyMs,
        engine: 'PostgreSQL 16 via Prisma ORM',
      },
      memory,
      workers: {
        active: activeWorkers,
        total: totalWorkers,
      },
      jobs: {
        totalProcessed: totalJobs,
      },
      environment: process.env.NODE_ENV || 'production',
    });
  } catch (error) {
    return errorResponse(error);
  }
}

