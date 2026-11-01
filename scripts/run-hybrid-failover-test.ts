// ==============================================================================
// LOSTLINK 2.0 — AUTOMATED HYBRID FAILOVER HARNESS
// Cloud Computing Module IV PBL Project
// ==============================================================================

import { prisma } from '../src/lib/db';
import { enqueueMatchingJob, leaseMatchingJob, completeMatchingJob, MatchEvaluationResult } from '../src/lib/hybrid/queue';
import { evaluateItemMatch } from '../src/lib/matching/matchEngine';
import { ItemReportType, ItemStatus, WorkerType, JobStatus } from '@prisma/client';

interface BenchmarkResult {
  step: string;
  jobId: string;
  expectedWorkerType: string;
  actualWorkerType: string;
  assignedWorkerId: string;
  durationMs: number;
  duplicateExecutions: number;
  success: boolean;
}

async function main() {
  console.log(`\n=====================================================================`);
  console.log(`   LOSTLINK 2.0 — HYBRID-CLOUD FAILOVER & RESILIENCE BENCHMARK      `);
  console.log(`   Public Cloud (Env A) <--> Campus Edge Worker (Env B)             `);
  console.log(`=====================================================================\n`);

  const results: BenchmarkResult[] = [];
  const testRunId = Date.now().toString(36);

  // 1. Setup Test Items in college-apex
  const apexCollege = await prisma.college.findUnique({
    where: { id: 'college-apex' },
    include: { campuses: { include: { locations: true } } },
  });

  if (!apexCollege || !apexCollege.campuses[0] || !apexCollege.campuses[0].locations[0]) {
    throw new Error('College Apex or campus locations not seeded in database.');
  }

  const campus = apexCollege.campuses[0];

  const studentA = await prisma.user.findUnique({ where: { id: 'user-maya' } });
  const studentB = await prisma.user.findUnique({ where: { id: 'user-jordan' } });

  if (!studentA || !studentB) {
    throw new Error('Test students user-maya or user-jordan not found.');
  }

  // Drain any lingering test jobs from prior runs
  await prisma.matchingJob.updateMany({
    where: { status: { in: [JobStatus.QUEUED, JobStatus.LEASED] } },
    data: { status: JobStatus.CANCELLED },
  });

  // Ensure worker key exists for worker-apex-edge-01
  await prisma.campusWorkerKey.upsert({
    where: { workerId: 'worker-apex-edge-01' },
    update: { status: 'ACTIVE' },
    create: {
      workerId: 'worker-apex-edge-01',
      apiKeyHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      keyPrefix: 'll_camp_live_apex',
      collegeId: apexCollege.id,
      name: 'Apex Primary Edge Worker',
      status: 'ACTIVE',
    },
  });

  // Create baseline FOUND item by Student A
  const foundItem = await prisma.item.create({
    data: {
      reportNumber: `FND-BENCH-${testRunId}-00`,
      type: ItemReportType.FOUND,
      name: `Navy Blue HydroFlask Bottle [Failover Benchmark ${testRunId}]`,
      description: 'Found navy blue stainless steel hydroflask bottle with scratches',
      category: 'BOTTLES',
      collegeId: apexCollege.id,
      campusId: campus.id,
      locationBuilding: 'Main Library',
      color: 'Navy Blue',
      brand: 'HydroFlask',
      reporterId: studentA.id,
      status: ItemStatus.OPEN,
      occurredAt: new Date(),
    },
  });

  console.log(`[SETUP] Seeded baseline FOUND item: ${foundItem.id} (Finder: ${studentA.name})`);

  // ============================================================================
  // STAGE 1: NORMAL HYBRID OPERATION (Campus Worker Active)
  // ============================================================================
  console.log(`\n---------------------------------------------------------------------`);
  console.log(`[STAGE 1] Testing Normal Operation: Campus Edge Worker Active`);
  console.log(`---------------------------------------------------------------------`);

  // Create matching LOST item by Student B
  const lostItem1 = await prisma.item.create({
    data: {
      reportNumber: `LST-BENCH-${testRunId}-01`,
      type: ItemReportType.LOST,
      name: `Navy Blue HydroFlask [Normal Run ${testRunId}]`,
      description: 'Lost my dark navy blue hydroflask bottle in the building',
      category: 'BOTTLES',
      collegeId: apexCollege.id,
      campusId: campus.id,
      locationBuilding: 'Main Library',
      color: 'Navy Blue',
      brand: 'HydroFlask',
      reporterId: studentB.id,
      status: ItemStatus.OPEN,
      occurredAt: new Date(),
    },
  });

  const t1Start = Date.now();
  const job1Id = await enqueueMatchingJob(lostItem1.id);
  if (!job1Id) throw new Error('Failed to enqueue Job #1');
  console.log(`[+] Enqueued Job #1: ${job1Id} (Target: college-apex)`);

  // Campus worker leases Job #1
  const lease1 = await leaseMatchingJob('worker-apex-edge-01', apexCollege.id, WorkerType.CAMPUS);
  if (!lease1 || lease1.jobId !== job1Id) {
    throw new Error(`Stage 1 Failed: Campus worker could not lease Job #1 (got ${lease1?.jobId})`);
  }
  console.log(`[+] Campus Edge Worker 'worker-apex-edge-01' leased Job #1 successfully.`);

  // Evaluate candidate match
  const eval1 = evaluateItemMatch(lostItem1 as any, foundItem as any);
  const matchResults1: MatchEvaluationResult[] = [];
  if (eval1.totalScore >= 50) {
    matchResults1.push({
      lostItemId: lostItem1.id,
      foundItemId: foundItem.id,
      totalScore: eval1.totalScore,
      confidenceTier: eval1.confidenceTier,
      matchingAttributes: eval1.matchingAttributes,
      safeExplanation: eval1.safeExplanation,
      breakdown: eval1.breakdown as any,
    });
  }

  const duration1 = Date.now() - t1Start;
  const comp1 = await completeMatchingJob(job1Id, 'worker-apex-edge-01', {
    executionTimeMs: duration1,
    workerId: 'worker-apex-edge-01',
    matches: matchResults1,
  });

  if (!comp1.success) {
    throw new Error(`Stage 1 Failed to complete: ${comp1.error}`);
  }

  const completedJob1 = await prisma.matchingJob.findUnique({ where: { id: job1Id } });

  results.push({
    step: '1. Normal Hybrid Match',
    jobId: job1Id,
    expectedWorkerType: 'CAMPUS',
    actualWorkerType: completedJob1?.workerType || 'NONE',
    assignedWorkerId: completedJob1?.assignedWorkerId || 'NONE',
    durationMs: duration1,
    duplicateExecutions: 0,
    success: completedJob1?.status === 'COMPLETED' && completedJob1?.workerType === 'CAMPUS',
  });
  console.log(`[✔] Stage 1 Completed by ${completedJob1?.assignedWorkerId} in ${duration1}ms with status ${completedJob1?.status}.`);

  // ============================================================================
  // STAGE 2: FAILURE INJECTION & CLOUD FALLBACK
  // ============================================================================
  console.log(`\n---------------------------------------------------------------------`);
  console.log(`[STAGE 2] Simulating Campus Edge Outage: Campus Worker OFFLINE`);
  console.log(`---------------------------------------------------------------------`);

  // Mark campus worker as SUSPENDED/OFFLINE
  await prisma.campusWorkerKey.update({
    where: { workerId: 'worker-apex-edge-01' },
    data: { status: 'SUSPENDED' },
  });
  console.log(`[!] INJECTED FAILURE: 'worker-apex-edge-01' status set to SUSPENDED (Campus disconnected).`);

  // Create second item by Student B
  const lostItem2 = await prisma.item.create({
    data: {
      reportNumber: `LST-BENCH-${testRunId}-02`,
      type: ItemReportType.LOST,
      name: `Navy Blue HydroFlask [Failover Run ${testRunId}]`,
      description: 'Lost hydroflask bottle during campus outage test',
      category: 'BOTTLES',
      collegeId: apexCollege.id,
      campusId: campus.id,
      locationBuilding: 'Main Library',
      color: 'Navy Blue',
      brand: 'HydroFlask',
      reporterId: studentB.id,
      status: ItemStatus.OPEN,
      occurredAt: new Date(),
    },
  });

  const t2Start = Date.now();
  const job2Id = await enqueueMatchingJob(lostItem2.id);
  if (!job2Id) throw new Error('Failed to enqueue Job #2');
  console.log(`[+] Enqueued Job #2: ${job2Id} while Campus Worker is down.`);

  // Cloud Fallback Watchdog reclaims job (collegeId is null so cloud fallback processes any college)
  console.log(`[*] Cloud Fallback Watchdog activating on Public Cloud VPS...`);
  const lease2 = await leaseMatchingJob('worker-cloud-fallback-01', null, WorkerType.CLOUD_FALLBACK);
  if (!lease2 || lease2.jobId !== job2Id) {
    throw new Error(`Stage 2 Failed: Cloud Fallback could not lease unserviced Job #2 (got ${lease2?.jobId})`);
  }
  console.log(`[+] Public Cloud Fallback 'worker-cloud-fallback-01' reclaimed Job #2.`);

  const eval2 = evaluateItemMatch(lostItem2 as any, foundItem as any);
  const matchResults2: MatchEvaluationResult[] = [];
  if (eval2.totalScore >= 50) {
    matchResults2.push({
      lostItemId: lostItem2.id,
      foundItemId: foundItem.id,
      totalScore: eval2.totalScore,
      confidenceTier: eval2.confidenceTier,
      matchingAttributes: eval2.matchingAttributes,
      safeExplanation: eval2.safeExplanation,
      breakdown: eval2.breakdown as any,
    });
  }

  const duration2 = Date.now() - t2Start;
  const comp2 = await completeMatchingJob(job2Id, 'worker-cloud-fallback-01', {
    executionTimeMs: duration2,
    workerId: 'worker-cloud-fallback-01',
    matches: matchResults2,
  });

  if (!comp2.success) {
    throw new Error(`Stage 2 Failed to complete: ${comp2.error}`);
  }

  const completedJob2 = await prisma.matchingJob.findUnique({ where: { id: job2Id } });

  results.push({
    step: '2. Cloud Fallback Match',
    jobId: job2Id,
    expectedWorkerType: 'CLOUD_FALLBACK',
    actualWorkerType: completedJob2?.workerType || 'NONE',
    assignedWorkerId: completedJob2?.assignedWorkerId || 'NONE',
    durationMs: duration2,
    duplicateExecutions: 0,
    success: completedJob2?.status === 'COMPLETED' && completedJob2?.workerType === 'CLOUD_FALLBACK',
  });
  console.log(`[✔] Stage 2 Completed by ${completedJob2?.assignedWorkerId} in ${duration2}ms with status ${completedJob2?.status}.`);

  // ============================================================================
  // STAGE 3: CONCURRENCY & SPLIT-BRAIN DEFENSE (Double-Completion Rejection)
  // ============================================================================
  console.log(`\n---------------------------------------------------------------------`);
  console.log(`[STAGE 3] Testing Split-Brain Defense (Double-Completion Attempt)`);
  console.log(`---------------------------------------------------------------------`);

  console.log(`[*] Simulating late-arriving completion from delayed campus worker on Job #2...`);
  const lateAttempt = await completeMatchingJob(job2Id, 'worker-apex-edge-01', {
    executionTimeMs: 999,
    workerId: 'worker-apex-edge-01',
    matches: [],
  });

  const doubleCompletionRejected = !lateAttempt.success;
  if (doubleCompletionRejected) {
    console.log(`[✔] Double-completion successfully REJECTED: ${lateAttempt.error}`);
  } else {
    console.error(`[!] Split-brain defense failed: Double-completion was accepted!`);
  }

  // Count matches created for item #2
  const matchesCount = await prisma.match.count({
    where: {
      OR: [
        { lostItemId: lostItem2.id },
        { foundItemId: lostItem2.id },
      ],
    },
  });

  results.push({
    step: '3. Split-Brain Defense',
    jobId: job2Id,
    expectedWorkerType: 'CLOUD_FALLBACK',
    actualWorkerType: completedJob2?.workerType || 'NONE',
    assignedWorkerId: completedJob2?.assignedWorkerId || 'NONE',
    durationMs: 0,
    duplicateExecutions: doubleCompletionRejected ? 0 : 1,
    success: doubleCompletionRejected && matchesCount <= 1,
  });

  // ============================================================================
  // STAGE 4: RECOVERY & RESUMPTION (Campus Worker Restored)
  // ============================================================================
  console.log(`\n---------------------------------------------------------------------`);
  console.log(`[STAGE 4] Testing Service Recovery: Campus Worker Restored`);
  console.log(`---------------------------------------------------------------------`);

  // Restore campus worker
  await prisma.campusWorkerKey.update({
    where: { workerId: 'worker-apex-edge-01' },
    data: { status: 'ACTIVE' },
  });
  console.log(`[+] RESTORED: 'worker-apex-edge-01' status set back to ACTIVE.`);

  // Create third item by Student B
  const lostItem3 = await prisma.item.create({
    data: {
      reportNumber: `LST-BENCH-${testRunId}-03`,
      type: ItemReportType.LOST,
      name: `Navy Blue HydroFlask [Post-Recovery Run ${testRunId}]`,
      description: 'Lost hydroflask bottle after network recovery',
      category: 'BOTTLES',
      collegeId: apexCollege.id,
      campusId: campus.id,
      locationBuilding: 'Main Library',
      color: 'Navy Blue',
      brand: 'HydroFlask',
      reporterId: studentB.id,
      status: ItemStatus.OPEN,
      occurredAt: new Date(),
    },
  });

  const t3Start = Date.now();
  const job3Id = await enqueueMatchingJob(lostItem3.id);
  if (!job3Id) throw new Error('Failed to enqueue Job #3');
  console.log(`[+] Enqueued Job #3: ${job3Id} after recovery.`);

  const lease3 = await leaseMatchingJob('worker-apex-edge-01', apexCollege.id, WorkerType.CAMPUS);
  if (!lease3 || lease3.jobId !== job3Id) {
    throw new Error(`Stage 4 Failed: Campus worker could not lease Job #3 after recovery (got ${lease3?.jobId})`);
  }
  console.log(`[+] Campus Edge Worker leased Job #3 successfully.`);

  const eval3 = evaluateItemMatch(lostItem3 as any, foundItem as any);
  const matchResults3: MatchEvaluationResult[] = [];
  if (eval3.totalScore >= 50) {
    matchResults3.push({
      lostItemId: lostItem3.id,
      foundItemId: foundItem.id,
      totalScore: eval3.totalScore,
      confidenceTier: eval3.confidenceTier,
      matchingAttributes: eval3.matchingAttributes,
      safeExplanation: eval3.safeExplanation,
      breakdown: eval3.breakdown as any,
    });
  }

  const duration3 = Date.now() - t3Start;
  const comp3 = await completeMatchingJob(job3Id, 'worker-apex-edge-01', {
    executionTimeMs: duration3,
    workerId: 'worker-apex-edge-01',
    matches: matchResults3,
  });

  if (!comp3.success) {
    throw new Error(`Stage 4 Failed to complete: ${comp3.error}`);
  }

  const completedJob3 = await prisma.matchingJob.findUnique({ where: { id: job3Id } });

  results.push({
    step: '4. Post-Recovery Campus Match',
    jobId: job3Id,
    expectedWorkerType: 'CAMPUS',
    actualWorkerType: completedJob3?.workerType || 'NONE',
    assignedWorkerId: completedJob3?.assignedWorkerId || 'NONE',
    durationMs: duration3,
    duplicateExecutions: 0,
    success: completedJob3?.status === 'COMPLETED' && completedJob3?.workerType === 'CAMPUS',
  });
  console.log(`[✔] Stage 4 Completed by ${completedJob3?.assignedWorkerId} in ${duration3}ms with status ${completedJob3?.status}.`);

  // ============================================================================
  // SUMMARY BENCHMARK REPORT
  // ============================================================================
  console.log(`\n=====================================================================`);
  console.log(`   LOSTLINK 2.0 — HYBRID FAILOVER BENCHMARK SUMMARY                 `);
  console.log(`=====================================================================`);
  console.log(`STEP                           | EXPECTED       | ACTUAL         | DURATION | DUPES | RESULT`);
  console.log(`-------------------------------+----------------+----------------+----------+-------+-------`);
  let allPassed = true;
  for (const r of results) {
    if (!r.success) allPassed = false;
    const step = r.step.padEnd(30);
    const exp = r.expectedWorkerType.padEnd(14);
    const act = r.actualWorkerType.padEnd(14);
    const dur = `${r.durationMs}ms`.padEnd(8);
    const dup = `${r.duplicateExecutions}`.padEnd(5);
    const res = r.success ? 'PASS  ' : 'FAIL  ';
    console.log(`${step} | ${exp} | ${act} | ${dur} | ${dup} | ${res}`);
  }
  console.log(`=====================================================================`);

  if (allPassed) {
    console.log(`\n🎉 [ALL TESTS PASSED] Hybrid-cloud failover, zero-split-brain, and recovery confirmed!\n`);
  } else {
    console.error(`\n❌ [FAILURES DETECTED] One or more benchmark stages failed!\n`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Fatal benchmark error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
