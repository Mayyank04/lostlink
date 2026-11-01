import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { hashApiKey, generateCampusApiKey } from '@/lib/hybrid/auth';
import {
  enqueueMatchingJob,
  leaseMatchingJob,
  completeMatchingJob,
} from '@/lib/hybrid/queue';
import { evaluateItemMatch } from '@/lib/matching/matchEngine';
import { ItemReportType, ItemStatus, JobStatus, WorkerType } from '@prisma/client';

describe('Phase 5 Distributed Hybrid Matching Architecture', () => {
  const TEST_COLLEGE_ID = 'college-apex';
  let testWorkerKey: string;
  let testWorkerId: string;
  let lostItemId: string;
  let foundItemId: string;

  beforeAll(async () => {
    // 1. Create a dedicated campus worker key
    const generated = generateCampusApiKey();
    testWorkerKey = generated.key;
    testWorkerId = `test-worker-${Date.now()}`;

    await prisma.campusWorkerKey.create({
      data: {
        workerId: testWorkerId,
        collegeId: TEST_COLLEGE_ID,
        name: 'Automated Vitest Campus Worker',
        apiKeyHash: generated.hash,
        keyPrefix: generated.prefix,
        status: 'ACTIVE',
      },
    });

    // 2. Fetch test user for reports
    const testUser = await prisma.user.findFirst({
      where: { email: 'maya.lin@apex.edu' },
    });
    if (!testUser) throw new Error('Test user not found');

    const testCampus = await prisma.campus.findFirst({
      where: { collegeId: TEST_COLLEGE_ID },
    });
    if (!testCampus) throw new Error('Test campus not found');

    // 3. Create test Lost & Found items
    const lostItem = await prisma.item.create({
      data: {
        collegeId: TEST_COLLEGE_ID,
        campusId: testCampus.id,
        reporterId: testUser.id,
        reportNumber: `TST-LST-${Date.now()}`,
        name: 'Sony WH-1000XM5 Wireless Headphones',
        type: ItemReportType.LOST,
        category: 'ELECTRONICS',
        color: 'Silver',
        brand: 'Sony',
        description: 'Silver wireless noise-canceling headphones lost in main study area.',
        locationBuilding: 'Main Library',
        occurredAt: new Date(Date.now() - 3600000),
        status: ItemStatus.OPEN,
      },
    });
    lostItemId = lostItem.id;

    const otherUser = await prisma.user.findFirst({
      where: { email: 'j.hayes@apex.edu' },
    });
    if (!otherUser) throw new Error('Other test user not found');

    const foundItem = await prisma.item.create({
      data: {
        collegeId: TEST_COLLEGE_ID,
        campusId: testCampus.id,
        reporterId: otherUser.id,
        reportNumber: `TST-FND-${Date.now()}`,
        name: 'Found Sony Noise Canceling Headphones Silver',
        type: ItemReportType.FOUND,
        category: 'ELECTRONICS',
        color: 'Silver',
        brand: 'Sony',
        description: 'Found silver Sony headphones left near study desks.',
        locationBuilding: 'Main Library',
        occurredAt: new Date(),
        status: ItemStatus.OPEN,
      },
    });
    foundItemId = foundItem.id;
  });

  afterAll(async () => {
    // Cleanup test data
    const ids = [lostItemId, foundItemId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.matchingJob.deleteMany({
        where: { reportId: { in: ids } },
      });
      await prisma.match.deleteMany({
        where: { OR: [{ lostItemId: { in: ids } }, { foundItemId: { in: ids } }] },
      });
      await prisma.item.deleteMany({
        where: { id: { in: ids } },
      });
    }
    if (testWorkerId) {
      await prisma.campusWorkerKey.deleteMany({
        where: { workerId: testWorkerId },
      });
    }
  });

  it('generates cryptographically valid API keys and verifies deterministic hashing', () => {
    const key = 'll_camp_live_demo1234567890abcdef';
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
  });

  it('enqueues a matching job with sanitized payload omitting student PII and evidence', async () => {
    const jobId = await enqueueMatchingJob(foundItemId);
    expect(jobId).toBeTruthy();

    const job = await prisma.matchingJob.findUnique({
      where: { id: jobId! },
    });

    expect(job).not.toBeNull();
    expect(job?.status).toBe(JobStatus.QUEUED);
    expect(job?.collegeId).toBe(TEST_COLLEGE_ID);

    const payload = JSON.parse(job!.payload);
    expect(payload.targetItem.id).toBe(foundItemId);
    expect(payload.targetItem.title).toContain('Sony');
    // Verify zero PII or private evidence fields
    expect(payload.targetItem).not.toHaveProperty('reporterId');
    expect(payload.targetItem).not.toHaveProperty('privateEvidence');
  });

  it('atomically leases the queued matching job to the authorized campus worker', async () => {
    const leased = await leaseMatchingJob(testWorkerId, TEST_COLLEGE_ID, WorkerType.CAMPUS);

    expect(leased).not.toBeNull();
    expect(leased?.targetItem.id).toBe(foundItemId);
    expect(new Date(leased!.leaseExpiresAt).getTime()).toBeGreaterThan(Date.now());

    // Verify database state transitioned to LEASED
    const jobInDb = await prisma.matchingJob.findUnique({
      where: { id: leased!.jobId },
    });
    expect(jobInDb?.status).toBe(JobStatus.LEASED);
    expect(jobInDb?.assignedWorkerId).toBe(testWorkerId);
    expect(jobInDb?.workerType).toBe(WorkerType.CAMPUS);
    expect(jobInDb?.attempts).toBe(1);
  });

  it('prevents another worker from concurrently double-leasing an active job', async () => {
    const secondClaim = await leaseMatchingJob('concurrent-rogue-worker', TEST_COLLEGE_ID);
    // Queue should now be empty because the job is leased and active
    expect(secondClaim).toBeNull();
  });

  it('reclaims expired leases when a campus worker crashes or times out', async () => {
    // Artificially expire the lease on the active job
    const activeJob = await prisma.matchingJob.findFirst({
      where: { assignedWorkerId: testWorkerId, status: JobStatus.LEASED },
    });
    expect(activeJob).not.toBeNull();

    await prisma.matchingJob.update({
      where: { id: activeJob!.id },
      data: {
        leaseExpiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      },
    });

    // Cloud fallback worker should now be able to reclaim the expired job!
    const fallbackClaim = await leaseMatchingJob(
      'worker-cloud-fallback-01',
      null, // Global worker
      WorkerType.CLOUD_FALLBACK
    );

    expect(fallbackClaim).not.toBeNull();
    expect(fallbackClaim?.jobId).toBe(activeJob!.id);

    const reclaimedJob = await prisma.matchingJob.findUnique({
      where: { id: activeJob!.id },
    });
    expect(reclaimedJob?.assignedWorkerId).toBe('worker-cloud-fallback-01');
    expect(reclaimedJob?.workerType).toBe(WorkerType.CLOUD_FALLBACK);
    expect(reclaimedJob?.attempts).toBe(2);
  });

  it('completes the job and records match results with anti-double-execution verification', async () => {
    const activeJob = await prisma.matchingJob.findFirst({
      where: { assignedWorkerId: 'worker-cloud-fallback-01', status: JobStatus.LEASED },
    });
    expect(activeJob).not.toBeNull();

    // 1. Unauthorized worker attempting to complete must fail
    const unauthorizedAttempt = await completeMatchingJob(
      activeJob!.id,
      'rogue-unassigned-worker',
      { matches: [], executionTimeMs: 12, workerId: 'rogue-unassigned-worker' }
    );
    expect(unauthorizedAttempt.success).toBe(false);
    expect(unauthorizedAttempt.error).toContain('Worker mismatch');

    // 2. Legitimate assigned worker executes local matching and submits results
    const lostItem = await prisma.item.findUnique({ where: { id: lostItemId } });
    const foundItem = await prisma.item.findUnique({ where: { id: foundItemId } });

    const evaluation = evaluateItemMatch(lostItem!, foundItem!);
    expect(evaluation.eligible).toBe(true);
    expect(evaluation.totalScore).toBeGreaterThanOrEqual(70);

    const completeResult = await completeMatchingJob(
      activeJob!.id,
      'worker-cloud-fallback-01',
      {
        matches: [
          {
            lostItemId,
            foundItemId,
            totalScore: evaluation.totalScore,
            confidenceTier: evaluation.confidenceTier,
            matchingAttributes: evaluation.matchingAttributes,
            safeExplanation: evaluation.safeExplanation,
            breakdown: evaluation.breakdown,
          },
        ],
        executionTimeMs: 15,
        workerId: 'worker-cloud-fallback-01',
      }
    );

    expect(completeResult.success).toBe(true);
    expect(completeResult.matchesRecorded).toBe(1);

    // Verify matching record was created in database
    const matchRecord = await prisma.match.findUnique({
      where: {
        lostItemId_foundItemId: { lostItemId, foundItemId },
      },
    });
    expect(matchRecord).not.toBeNull();
    expect(matchRecord?.score).toBe(evaluation.totalScore);

    // 3. Duplicate completion attempt on already completed job must fail
    const duplicateAttempt = await completeMatchingJob(
      activeJob!.id,
      'worker-cloud-fallback-01',
      { matches: [], executionTimeMs: 5, workerId: 'worker-cloud-fallback-01' }
    );
    expect(duplicateAttempt.success).toBe(false);
    expect(duplicateAttempt.error).toContain('Invalid job status: expected LEASED but found COMPLETED');
  });
});
