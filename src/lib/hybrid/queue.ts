import { prisma } from '@/lib/db';
import { ItemStatus, ItemReportType, JobStatus, WorkerType } from '@prisma/client';
import { evaluateItemMatch, MATCH_CONFIG } from '@/lib/matching/matchEngine';

const LEASE_DURATION_MS = 30 * 1000; // 30-second lease Time-To-Live (TTL)

export interface SanitizedMatchItem {
  id: string;
  title: string;
  description: string;
  category: string;
  type: ItemReportType;
  primaryColor: string | null;
  secondaryColor: string | null;
  brand: string | null;
  model: string | null;
  occurredAt: string;
  campusId: string;
  locationId: string | null;
}

export interface MatchEvaluationResult {
  lostItemId: string;
  foundItemId: string;
  totalScore: number;
  confidenceTier: string;
  matchingAttributes: string[];
  safeExplanation: string;
  breakdown: Record<string, any>;
}

/**
 * Enqueues a new deterministic matching job into the distributed hybrid queue
 */
export async function enqueueMatchingJob(itemId: string): Promise<string | null> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      campus: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
  });

  if (!item || item.status !== ItemStatus.OPEN) {
    return null;
  }

  const oppositeType = item.type === ItemReportType.LOST ? ItemReportType.FOUND : ItemReportType.LOST;

  // Query candidate items from the same institution
  const candidates = await prisma.item.findMany({
    where: {
      collegeId: item.collegeId,
      type: oppositeType,
      status: ItemStatus.OPEN,
      reporterId: { not: item.reporterId },
      isArchived: false,
    },
    take: 50, // Bounded candidate slice
  });

  // Sanitize target item: strip private ownership evidence and reporter PII
  const sanitizedTarget: SanitizedMatchItem = {
    id: item.id,
    title: item.name,
    description: item.description,
    category: item.category,
    type: item.type,
    primaryColor: item.color,
    secondaryColor: item.secondaryColor,
    brand: item.brand,
    model: null,
    occurredAt: item.occurredAt.toISOString(),
    campusId: item.campusId,
    locationId: item.locationId,
  };

  // Sanitize candidate items
  const sanitizedCandidates: SanitizedMatchItem[] = candidates.map((cand) => ({
    id: cand.id,
    title: cand.name,
    description: cand.description,
    category: cand.category,
    type: cand.type,
    primaryColor: cand.color,
    secondaryColor: cand.secondaryColor,
    brand: cand.brand,
    model: null,
    occurredAt: cand.occurredAt.toISOString(),
    campusId: cand.campusId,
    locationId: cand.locationId,
  }));

  const payload = JSON.stringify({
    targetItem: sanitizedTarget,
    candidates: sanitizedCandidates,
  });

  const job = await prisma.matchingJob.create({
    data: {
      collegeId: item.collegeId,
      reportId: item.id,
      itemType: item.type,
      ruleVersion: 'v2.0-deterministic',
      status: JobStatus.QUEUED,
      payload,
    },
  });

  console.log(`[HybridQueue] Enqueued MatchingJob ${job.id} for Item ${item.id} (${candidates.length} candidates)`);
  return job.id;
}

/**
 * Atomically leases a pending or expired job to an authorized worker
 */
export async function leaseMatchingJob(
  workerId: string,
  collegeId: string | null,
  workerType: WorkerType = WorkerType.CAMPUS
): Promise<{
  jobId: string;
  collegeId: string;
  reportId: string;
  itemType: ItemReportType;
  ruleVersion: string;
  targetItem: SanitizedMatchItem;
  candidates: SanitizedMatchItem[];
  leaseExpiresAt: string;
} | null> {
  const now = new Date();
  const leaseExpiration = new Date(Date.now() + LEASE_DURATION_MS);

  // Find eligible candidate job: either QUEUED or LEASED with expired lease
  const candidateJobs = await prisma.matchingJob.findMany({
    where: {
      status: { in: [JobStatus.QUEUED, JobStatus.LEASED, JobStatus.RETRY_PENDING] },
      attempts: { lt: 3 },
      ...(collegeId ? { collegeId } : {}),
      OR: [
        { status: JobStatus.QUEUED },
        { status: JobStatus.RETRY_PENDING },
        {
          status: JobStatus.LEASED,
          leaseExpiresAt: { lt: now },
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 1,
  });

  if (candidateJobs.length === 0) return null;

  const targetJob = candidateJobs[0];

  // Concurrency-safe atomic claim to prevent double-leasing
  const updateResult = await prisma.matchingJob.updateMany({
    where: {
      id: targetJob.id,
      status: targetJob.status,
      // If was previously leased, ensure lease is still expired
      ...(targetJob.status === JobStatus.LEASED
        ? { leaseExpiresAt: { lt: now } }
        : {}),
    },
    data: {
      status: JobStatus.LEASED,
      assignedWorkerId: workerId,
      workerType,
      leasedAt: now,
      leaseExpiresAt: leaseExpiration,
      attempts: { increment: 1 },
    },
  });

  if (updateResult.count === 0) {
    // Another worker claimed this job concurrently
    return null;
  }

  let parsedPayload: { targetItem: SanitizedMatchItem; candidates: SanitizedMatchItem[] };
  try {
    parsedPayload = JSON.parse(targetJob.payload);
  } catch (err) {
    console.error(`[HybridQueue] Malformed payload in job ${targetJob.id}:`, err);
    await prisma.matchingJob.update({
      where: { id: targetJob.id },
      data: { status: JobStatus.FAILED, error: 'Malformed JSON payload' },
    });
    return null;
  }

  return {
    jobId: targetJob.id,
    collegeId: targetJob.collegeId,
    reportId: targetJob.reportId,
    itemType: targetJob.itemType,
    ruleVersion: targetJob.ruleVersion,
    targetItem: parsedPayload.targetItem,
    candidates: parsedPayload.candidates,
    leaseExpiresAt: leaseExpiration.toISOString(),
  };
}

/**
 * Acknowledges and atomically persists match results computed by the worker
 */
export async function completeMatchingJob(
  jobId: string,
  workerId: string,
  results: {
    matches: MatchEvaluationResult[];
    executionTimeMs: number;
    workerId: string;
  }
): Promise<{ success: boolean; error?: string; matchesRecorded: number }> {
  const job = await prisma.matchingJob.findUnique({
    where: { id: jobId },
    include: { item: true },
  });

  if (!job) {
    return { success: false, error: 'Job not found', matchesRecorded: 0 };
  }

  // Verify worker assignment and lease state
  if (job.status !== JobStatus.LEASED) {
    return {
      success: false,
      error: `Invalid job status: expected LEASED but found ${job.status}`,
      matchesRecorded: 0,
    };
  }

  if (job.assignedWorkerId !== workerId) {
    return {
      success: false,
      error: `Worker mismatch: assigned to ${job.assignedWorkerId}, submitted by ${workerId}`,
      matchesRecorded: 0,
    };
  }

  let matchesRecorded = 0;

  // Execute database transaction to record matches and finalize job
  await prisma.$transaction(async (tx) => {
    // 1. Finalize the job status
    await tx.matchingJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        result: JSON.stringify(results),
      },
    });

    // 2. Persist matches
    for (const match of results.matches) {
      if (match.totalScore < MATCH_CONFIG.THRESHOLDS.MINIMUM_PERSISTENCE) continue;

      const lostItem = await tx.item.findUnique({ where: { id: match.lostItemId } });
      const foundItem = await tx.item.findUnique({ where: { id: match.foundItemId } });

      if (!lostItem || !foundItem) continue;

      const record = await tx.match.upsert({
        where: {
          lostItemId_foundItemId: {
            lostItemId: match.lostItemId,
            foundItemId: match.foundItemId,
          },
        },
        update: {
          score: match.totalScore,
          explanation: JSON.stringify({
            confidenceTier: match.confidenceTier,
            breakdown: match.breakdown,
            matchingAttributes: match.matchingAttributes,
            safeExplanation: match.safeExplanation,
            computedBy: workerId,
            computedAt: new Date().toISOString(),
          }),
        },
        create: {
          collegeId: lostItem.collegeId,
          lostItemId: match.lostItemId,
          foundItemId: match.foundItemId,
          score: match.totalScore,
          status: 'UNREVIEWED',
          explanation: JSON.stringify({
            confidenceTier: match.confidenceTier,
            breakdown: match.breakdown,
            matchingAttributes: match.matchingAttributes,
            safeExplanation: match.safeExplanation,
            computedBy: workerId,
            computedAt: new Date().toISOString(),
          }),
        },
      });

      matchesRecorded++;

      // 3. Mark items as POTENTIAL_MATCH if score >= 85 and status is OPEN
      if (match.totalScore >= MATCH_CONFIG.THRESHOLDS.STRONG_MATCH) {
        if (lostItem.status === ItemStatus.OPEN) {
          await tx.item.update({
            where: { id: lostItem.id },
            data: { status: ItemStatus.POTENTIAL_MATCH },
          });
        }
        if (foundItem.status === ItemStatus.OPEN) {
          await tx.item.update({
            where: { id: foundItem.id },
            data: { status: ItemStatus.POTENTIAL_MATCH },
          });
        }
      }

      // 4. Send in-app notification to the lost item owner
      await tx.notification.create({
        data: {
          userId: lostItem.reporterId,
          type: 'match_found',
          title: 'Potential Match Discovered',
          message: `A found item "${foundItem.name}" scored ${match.totalScore}% match with your lost report.`,
          linkUrl: `/items/${lostItem.id}`,
          resourceId: record.id,
        },
      });
    }
  });

  console.log(`[HybridQueue] Job ${jobId} successfully COMPLETED by ${workerId} (${matchesRecorded} matches persisted)`);
  return { success: true, matchesRecorded };
}
