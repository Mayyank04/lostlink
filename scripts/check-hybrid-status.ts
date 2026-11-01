#!/usr/bin/env tsx
// ==============================================================================
// LOSTLINK 2.0 — HYBRID QUEUE & EDGE WORKER STATUS MONITOR
// Usage: npx tsx scripts/check-hybrid-status.sh
// ==============================================================================

import { prisma } from '../src/lib/db';

async function main() {
  console.log(`=====================================================================`);
  console.log(`   LostLink 2.0 — Hybrid Edge & Cloud Matching Queue Monitor         `);
  console.log(`=====================================================================\n`);

  // 1. Registered Edge Workers
  const workers = await prisma.campusWorkerKey.findMany({
    include: {
      college: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`1. REGISTERED CAMPUS WORKERS (${workers.length}):`);
  console.log(`---------------------------------------------------------------------`);
  if (workers.length === 0) {
    console.log(`   No campus edge workers registered yet.`);
  } else {
    for (const w of workers) {
      const hb = w.lastHeartbeatAt ? `${w.lastHeartbeatAt.toISOString()} (${Math.round((Date.now() - w.lastHeartbeatAt.getTime()) / 1000)}s ago)` : 'Never';
      console.log(`   * Worker:    ${w.workerId} [${w.status}]`);
      console.log(`     Name:      ${w.name}`);
      console.log(`     College:   ${w.college?.name || 'Platform-Wide (Multi-College)'}`);
      console.log(`     Prefix:    ${w.keyPrefix}****`);
      console.log(`     Heartbeat: ${hb}`);
      if (w.metrics) {
        console.log(`     Metrics:   ${w.metrics}`);
      }
      console.log(`---------------------------------------------------------------------`);
    }
  }

  // 2. Queue Status Breakdown
  const queueStats = await prisma.matchingJob.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  console.log(`\n2. MATCHING JOB QUEUE STATUS:`);
  console.log(`---------------------------------------------------------------------`);
  const statusMap: Record<string, number> = {
    QUEUED: 0,
    LEASED: 0,
    RUNNING: 0,
    COMPLETED: 0,
    RETRY_PENDING: 0,
    FAILED: 0,
    CANCELLED: 0,
  };
  for (const s of queueStats) {
    statusMap[s.status] = s._count.id;
  }
  for (const [status, count] of Object.entries(statusMap)) {
    console.log(`   ${status.padEnd(16)} : ${count}`);
  }

  // 3. Execution Execution Distribution (Campus vs Cloud)
  const workerDist = await prisma.matchingJob.groupBy({
    by: ['workerType'],
    where: { status: 'COMPLETED' },
    _count: { id: true },
  });

  console.log(`\n3. HYBRID EXECUTION SPLIT (COMPLETED JOBS):`);
  console.log(`---------------------------------------------------------------------`);
  for (const dist of workerDist) {
    const type = dist.workerType || 'UNSPECIFIED';
    console.log(`   ${type.padEnd(16)} : ${dist._count.id} jobs`);
  }

  // 4. Recent Completed Jobs
  const recentJobs = await prisma.matchingJob.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      collegeId: true,
      status: true,
      workerType: true,
      assignedWorkerId: true,
      result: true,
      completedAt: true,
      updatedAt: true,
    },
  });

  console.log(`\n4. RECENT 5 MATCHING JOBS:`);
  console.log(`---------------------------------------------------------------------`);
  for (const j of recentJobs) {
    let dur = 0;
    try {
      if (j.result) {
        const parsed = JSON.parse(j.result);
        dur = parsed.executionTimeMs || 0;
      }
    } catch {}
    console.log(`   Job [${j.id.slice(0, 10)}...] | Status: ${j.status.padEnd(9)} | Type: ${(j.workerType || 'N/A').padEnd(14)} | Worker: ${j.assignedWorkerId || 'N/A'} | Time: ${dur}ms`);
  }

  console.log(`=====================================================================\n`);
}

main()
  .catch((e) => {
    console.error('Error fetching hybrid status:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
