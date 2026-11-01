import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Readiness Probe: Confirms the application is ready to accept incoming user traffic.
 * Checks essential database connectivity with bounded 2-second timeout.
 */
export async function GET() {
  const start = Date.now();

  try {
    // 2-second timeout on DB ping
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database ping timeout')), 2000)),
    ]);

    const latencyMs = Date.now() - start;

    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected',
      latencyMs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error?.message || 'Database unavailable',
      },
      { status: 503 }
    );
  }
}
