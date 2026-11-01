import http from 'http';
import { evaluateItemMatch, MATCH_CONFIG } from '../src/lib/matching/matchEngine';

const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const CAMPUS_WORKER_KEY = process.env.CAMPUS_WORKER_KEY || 'll_camp_live_apex_edge_secret_key_2026';
const WORKER_ID = process.env.WORKER_ID || 'worker-apex-edge-01';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '2500', 10);
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '10000', 10);
const CAMPUS_HEALTH_PORT = parseInt(process.env.CAMPUS_HEALTH_PORT || '3002', 10);

let isRunning = true;
let isPolling = false;
let jobsCompletedCount = 0;
let jobsFailedCount = 0;
let lastHeartbeat = Date.now();
let lastJobProcessedAt: string | null = null;

console.log(`================================================================`);
console.log(`[CampusWorker] LostLink 2.0 Dedicated Campus Matching Agent`);
console.log(`Worker ID:          ${WORKER_ID}`);
console.log(`Public Cloud API:   ${PUBLIC_API_URL}`);
console.log(`Poll Interval:      ${POLL_INTERVAL_MS}ms`);
console.log(`Health Port:        ${CAMPUS_HEALTH_PORT}`);
console.log(`================================================================`);

/**
 * Health check server for Kubernetes and monitoring
 */
const healthServer = http.createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/live' || req.url === '/ready') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        role: 'campus-matching-agent',
        workerId: WORKER_ID,
        uptime: process.uptime(),
        lastHeartbeat: new Date(lastHeartbeat).toISOString(),
        lastJobProcessedAt,
        jobsCompleted: jobsCompletedCount,
        jobsFailed: jobsFailedCount,
      })
    );
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(CAMPUS_HEALTH_PORT, () => {
  console.log(`[CampusWorker] Local health probe active on port ${CAMPUS_HEALTH_PORT} (/healthz)`);
});

/**
 * Dispatches outbound heartbeat ping to public cloud
 */
async function sendHeartbeat(): Promise<void> {
  try {
    const memoryUsage = process.memoryUsage();
    const payload = {
      workerId: WORKER_ID,
      uptime: process.uptime(),
      memoryMb: Math.round(memoryUsage.rss / 1024 / 1024),
      jobsCompleted: jobsCompletedCount,
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/hybrid/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CAMPUS_WORKER_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      lastHeartbeat = Date.now();
      const data = await res.json();
      if (data.queueStatus?.queuedJobs > 0) {
        console.log(`[CampusWorker] Heartbeat OK. Queue depth: ${data.queueStatus.queuedJobs} pending jobs.`);
      }
    } else {
      console.warn(`[CampusWorker] Heartbeat warning: HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.error(`[CampusWorker] Outbound heartbeat failed (Public API unreachable?):`, err.message);
  }
}

/**
 * Polls for a leased matching job and executes local deterministic matching
 */
async function pollAndProcessJob(): Promise<boolean> {
  if (isPolling || !isRunning) return false;
  isPolling = true;

  try {
    // 1. Request job lease from public cloud
    const leaseRes = await fetch(`${PUBLIC_API_URL}/api/hybrid/jobs/lease`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CAMPUS_WORKER_KEY}`,
      },
      body: JSON.stringify({
        workerId: WORKER_ID,
        clientVersion: '2.0-campus-agent',
      }),
    });

    if (!leaseRes.ok) {
      if (leaseRes.status === 401 || leaseRes.status === 403) {
        console.error(`[CampusWorker] Authentication rejected by cloud: HTTP ${leaseRes.status}`);
      }
      return false;
    }

    const leaseData = await leaseRes.json();
    if (leaseData.status !== 'leased' || !leaseData.job) {
      return false; // Queue idle
    }

    const { job } = leaseData;
    const startTime = Date.now();
    console.log(`[CampusWorker] LEASED Job ${job.jobId} for Item ${job.reportId} (${job.candidates.length} candidates)`);

    // 2. Execute local rule-based deterministic matching engine
    const matches: any[] = [];
    const targetItem = job.targetItem;

    for (const candidate of job.candidates) {
      const lostItem = targetItem.type === 'LOST' ? targetItem : candidate;
      const foundItem = targetItem.type === 'FOUND' ? targetItem : candidate;

      // Adapt sanitized candidate representation to evaluator input
      const evalLost = {
        id: lostItem.id,
        name: lostItem.title,
        description: lostItem.description,
        category: lostItem.category,
        color: lostItem.primaryColor || '',
        secondaryColor: lostItem.secondaryColor || null,
        brand: lostItem.brand || null,
        occurredAt: new Date(lostItem.occurredAt),
        campusId: lostItem.campusId,
        locationId: lostItem.locationId,
      };

      const evalFound = {
        id: foundItem.id,
        name: foundItem.title,
        description: foundItem.description,
        category: foundItem.category,
        color: foundItem.primaryColor || '',
        secondaryColor: foundItem.secondaryColor || null,
        brand: foundItem.brand || null,
        occurredAt: new Date(foundItem.occurredAt),
        campusId: foundItem.campusId,
        locationId: foundItem.locationId,
      };

      const evaluation = evaluateItemMatch(evalLost as any, evalFound as any);

      if (evaluation.eligible && evaluation.totalScore >= MATCH_CONFIG.THRESHOLDS.MINIMUM_PERSISTENCE) {
        matches.push({
          lostItemId: lostItem.id,
          foundItemId: foundItem.id,
          totalScore: evaluation.totalScore,
          confidenceTier: evaluation.confidenceTier,
          matchingAttributes: evaluation.matchingAttributes,
          safeExplanation: evaluation.safeExplanation,
          breakdown: evaluation.breakdown,
        });
      }
    }

    const executionTimeMs = Date.now() - startTime;
    console.log(`[CampusWorker] Computed ${matches.length} matches in ${executionTimeMs}ms. Submitting to cloud...`);

    // 3. Submit results back to cloud API
    const completeRes = await fetch(`${PUBLIC_API_URL}/api/hybrid/jobs/${job.jobId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CAMPUS_WORKER_KEY}`,
      },
      body: JSON.stringify({
        matches,
        executionTimeMs,
      }),
    });

    if (completeRes.ok) {
      jobsCompletedCount++;
      lastJobProcessedAt = new Date().toISOString();
      console.log(`[CampusWorker] Job ${job.jobId} marked COMPLETED on cloud. (Total completed: ${jobsCompletedCount})`);
      return true;
    } else {
      jobsFailedCount++;
      const errorText = await completeRes.text();
      console.error(`[CampusWorker] Failed to submit job results: HTTP ${completeRes.status}`, errorText);
      return false;
    }
  } catch (err: any) {
    console.error(`[CampusWorker] Job processing loop error:`, err.message);
    return false;
  } finally {
    isPolling = false;
  }
}

/**
 * Main agent lifecycle loops
 */
async function startWorker(): Promise<void> {
  console.log(`[CampusWorker] Starting background polling and heartbeat loops...`);

  // Heartbeat loop
  setInterval(() => {
    if (isRunning) sendHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);

  // Initial immediate heartbeat
  await sendHeartbeat();

  // Polling loop
  while (isRunning) {
    try {
      const hadJob = await pollAndProcessJob();
      // If a job was processed, immediately check for another; otherwise wait interval
      if (!hadJob) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (err: any) {
      console.error(`[CampusWorker] Unhandled loop error:`, err);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

// Graceful Shutdown
function handleShutdown(signal: string) {
  console.log(`[CampusWorker] Received ${signal}. Initiating graceful agent shutdown...`);
  isRunning = false;
  healthServer.close(() => {
    console.log(`[CampusWorker] Health server closed. Exiting process.`);
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startWorker().catch((err) => {
  console.error(`[CampusWorker] Fatal startup error:`, err);
  process.exit(1);
});
