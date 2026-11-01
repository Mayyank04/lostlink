import crypto from 'crypto';
import { prisma } from '@/lib/db';

export interface AuthorizedCampusWorker {
  id: string;
  workerId: string;
  collegeId: string | null;
  name: string;
  status: string;
}

/**
 * Computes deterministic SHA-256 hash for secure storage of API keys
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex');
}

/**
 * Generates a cryptographically strong campus worker API key
 */
export function generateCampusApiKey(): { key: string; hash: string; prefix: string } {
  const rawEntropy = crypto.randomBytes(24).toString('hex');
  const key = `ll_camp_live_${rawEntropy}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 18); // e.g. "ll_camp_live_a1b2c3"
  return { key, hash, prefix };
}

/**
 * Validates incoming campus worker HTTP request against registered keys
 */
export async function validateCampusWorkerRequest(
  request: Request
): Promise<{ authorized: true; worker: AuthorizedCampusWorker } | { authorized: false; error: string; status: number }> {
  // Extract API key from Authorization header or X-Campus-Worker-Key header
  let rawKey: string | null = null;
  const authHeader = request.headers.get('authorization');
  const customHeader = request.headers.get('x-campus-worker-key');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawKey = authHeader.substring(7).trim();
  } else if (customHeader) {
    rawKey = customHeader.trim();
  }

  if (!rawKey) {
    return {
      authorized: false,
      error: 'Missing campus worker credentials (Authorization: Bearer <key> or X-Campus-Worker-Key)',
      status: 401,
    };
  }

  const computedHash = hashApiKey(rawKey);

  // Lookup active worker key in database
  const workerKeyRecord = await prisma.campusWorkerKey.findFirst({
    where: {
      apiKeyHash: computedHash,
      status: 'ACTIVE',
    },
    include: {
      college: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!workerKeyRecord) {
    return {
      authorized: false,
      error: 'Invalid or revoked campus worker credentials',
      status: 403,
    };
  }

  // Update heartbeat and IP address asynchronously
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  prisma.campusWorkerKey
    .update({
      where: { id: workerKeyRecord.id },
      data: {
        lastHeartbeatAt: new Date(),
        lastIpAddress: clientIp,
      },
    })
    .catch((err) => console.error('[HybridAuth] Failed to update heartbeat:', err));

  return {
    authorized: true,
    worker: {
      id: workerKeyRecord.id,
      workerId: workerKeyRecord.workerId,
      collegeId: workerKeyRecord.collegeId,
      name: workerKeyRecord.name,
      status: workerKeyRecord.status,
    },
  };
}

