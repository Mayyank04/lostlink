import http from 'http';
import { prisma } from '../src/lib/db';
import { triggerMatchingEngineForItem, recalculateMatchesForCollege } from '../src/lib/matching/matchEngine';
import { HandoverStatus } from '@prisma/client';

const WORKER_PORT = parseInt(process.env.WORKER_HEALTH_PORT || '3001', 10);
const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || '3000', 10);
const BATCH_SIZE = 10;

let isRunning = true;
let isProcessingBatch = false;
let lastHeartbeat = Date.now();
let jobsProcessedCount = 0;
let jobsFailedCount = 0;

/**
 * Lightweight Health Server for Kubernetes Liveness & Readiness Probes
 */
const healthServer = http.createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/live' || req.url === '/ready') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'lostlink-worker',
        uptime: process.uptime(),
        lastHeartbeat: new Date(lastHeartbeat).toISOString(),
        jobsProcessed: jobsProcessedCount,
        jobsFailed: jobsFailedCount,
      })
    );
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(WORKER_PORT, () => {
  console.log(`[Worker] Health server listening on port ${WORKER_PORT} (/healthz)`);
});

/**
 * Atomically claims and processes pending outbox events
 */
async function processOutboxBatch(): Promise<number> {
  const pendingEvents = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  if (pendingEvents.length === 0) return 0;

  let count = 0;

  for (const event of pendingEvents) {
    if (!isRunning) break;

    // Atomically claim event to prevent concurrent workers from processing
    const claimed = await prisma.outboxEvent.updateMany({
      where: { id: event.id, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });

    if (claimed.count === 0) continue; // Claimed by another worker replica

    try {
      let payload: any = {};
      try {
        payload = JSON.parse(event.payload);
      } catch {
        payload = { raw: event.payload };
      }

      console.log(`[Worker] Processing event ${event.id} of type "${event.eventType}"`);

      switch (event.eventType) {
        case 'MATCH_RECALCULATION':
          if (payload.itemId) {
            await triggerMatchingEngineForItem(payload.itemId);
          } else if (payload.collegeId) {
            await recalculateMatchesForCollege(payload.collegeId);
          }
          break;

        case 'NOTIFICATION':
          if (payload.userId && payload.message) {
            await prisma.notification.create({
              data: {
                userId: payload.userId,
                type: payload.type || 'system_update',
                title: payload.title || 'Campus Notification',
                message: payload.message,
                linkUrl: payload.linkUrl,
                resourceId: payload.resourceId,
              },
            });
          }
          break;

        case 'EMAIL':
          // Log or integrate with email provider
          console.log(`[Worker Email] Dispatched to ${payload.to}: "${payload.subject}"`);
          break;

        default:
          console.warn(`[Worker] Unrecognized event type: ${event.eventType}`);
          break;
      }

      // Mark event PROCESSED
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          error: null,
        },
      });

      jobsProcessedCount++;
      count++;
    } catch (err: any) {
      console.error(`[Worker] Failed processing event ${event.id}:`, err?.message || err);
      jobsFailedCount++;

      const nextAttempts = event.attempts + 1;
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: nextAttempts >= 5 ? 'FAILED' : 'PENDING',
          attempts: nextAttempts,
          error: err?.message || 'Processing error',
        },
      });
    }
  }

  return count;
}

/**
 * Sweeps and expires stale Handover Challenges (older than 24 hours)
 */
async function sweepExpiredHandovers(): Promise<number> {
  const result = await prisma.handoverChallenge.updateMany({
    where: {
      status: HandoverStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    data: {
      status: HandoverStatus.EXPIRED,
    },
  });

  if (result.count > 0) {
    console.log(`[Worker] Expired ${result.count} stale handover challenges.`);
  }

  return result.count;
}

/**
 * Cleans up expired user sessions
 */
async function sweepExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}

/**
 * Main worker background loop
 */
async function startWorkerLoop() {
  console.log('[Worker] LostLink Background Worker daemon initialized.');
  let iteration = 0;

  while (isRunning) {
    lastHeartbeat = Date.now();
    iteration++;

    try {
      isProcessingBatch = true;
      await processOutboxBatch();

      // Every ~60s (20 iterations of 3s)
      if (iteration % 20 === 0) {
        await sweepExpiredHandovers();
      }

      // Every ~5m (100 iterations of 3s)
      if (iteration % 100 === 0) {
        await sweepExpiredSessions();
      }
    } catch (err: any) {
      console.error('[Worker Loop Error]:', err?.message || err);
    } finally {
      isProcessingBatch = false;
    }

    if (!isRunning) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  console.log('[Worker] Worker loop stopped. Exiting.');
}

/**
 * Graceful termination handler
 */
function handleShutdown(signal: string) {
  console.log(`[Worker] Received ${signal}. Initiating graceful shutdown...`);
  isRunning = false;

  const forceExitTimeout = setTimeout(() => {
    console.error('[Worker] Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000);

  const checkInterval = setInterval(async () => {
    if (!isProcessingBatch) {
      clearInterval(checkInterval);
      clearTimeout(forceExitTimeout);

      healthServer.close(() => {
        console.log('[Worker] Health server closed.');
      });

      await prisma.$disconnect().catch(() => {});
      console.log('[Worker] Database disconnected. Graceful shutdown complete.');
      process.exit(0);
    }
  }, 200);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Start execution
startWorkerLoop().catch((err) => {
  console.error('[Worker Fatal Error]:', err);
  process.exit(1);
});
