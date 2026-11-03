import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { JobStatus } from '@prisma/client';

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

    const [
      activeWorkers,
      totalWorkers,
      totalJobs,
      pendingJobs,
      failedJobs,
      totalItems,
      totalUsers,
      totalColleges,
    ] = await Promise.all([
      prisma.campusWorkerKey.count({ where: { status: 'ACTIVE' } }),
      prisma.campusWorkerKey.count(),
      prisma.matchingJob.count(),
      prisma.matchingJob.count({ where: { status: JobStatus.QUEUED } }),
      prisma.matchingJob.count({ where: { status: JobStatus.FAILED } }),
      prisma.item.count(),
      prisma.user.count(),
      prisma.college.count({ where: { isArchived: false } }),
    ]);

    const isK8sConfigured = Boolean(process.env.KUBERNETES_SERVICE_HOST);

    return NextResponse.json({
      success: true,
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      process: {
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        arch: process.arch,
        platform: process.platform,
        memory,
      },
      database: {
        status: 'CONNECTED',
        latencyMs: dbLatencyMs,
        engine: 'PostgreSQL 16 via Prisma ORM',
        totalItems,
        totalUsers,
        totalColleges,
      },
      workers: {
        active: activeWorkers,
        total: totalWorkers,
      },
      queue: {
        pendingJobs,
        failedJobs,
        totalProcessed: totalJobs,
      },
      kubernetes: {
        configured: isK8sConfigured,
        status: isK8sConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
        note: isK8sConfigured
          ? `In-Cluster Kubernetes API Active (${process.env.KUBERNETES_SERVICE_HOST})`
          : 'Not configured (Running in container / standalone node. Connect in-cluster service account or Prometheus for live pod metrics).',
      },
      environment: process.env.NODE_ENV || 'production',
    });
  } catch (error) {
    return errorResponse(error);
  }
}

