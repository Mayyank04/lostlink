import { prisma } from '@/lib/db';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired in-memory keys periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (record.resetTime <= now) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);
}

/**
 * In-memory sliding window rate limiter (fast sub-millisecond check)
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts = 10,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || record.resetTime <= now) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetInMs: windowMs,
    };
  }

  if (record.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, record.resetTime - now),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    resetInMs: Math.max(0, record.resetTime - now),
  };
}

/**
 * Distributed rate limiter backed by PostgreSQL RateLimitBucket.
 * Coordinates rate limiting across multiple Kubernetes web Pod replicas.
 */
export async function checkDistributedRateLimit(
  identifier: string,
  maxAttempts = 10,
  windowMs = 60 * 1000
): Promise<{ allowed: boolean; remaining: number; resetInMs: number }> {
  // Always perform local fast-check first
  const localCheck = checkRateLimit(identifier, maxAttempts, windowMs);
  if (!localCheck.allowed) {
    return localCheck;
  }

  const now = new Date();
  const expireAt = new Date(Date.now() + windowMs);

  try {
    const bucket = await prisma.rateLimitBucket.findUnique({
      where: { key: identifier },
    });

    if (!bucket || bucket.expireAt <= now) {
      await prisma.rateLimitBucket.upsert({
        where: { key: identifier },
        update: { points: 1, expireAt },
        create: { key: identifier, points: 1, expireAt },
      });
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetInMs: windowMs,
      };
    }

    if (bucket.points >= maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetInMs: Math.max(0, bucket.expireAt.getTime() - now.getTime()),
      };
    }

    const updated = await prisma.rateLimitBucket.update({
      where: { key: identifier },
      data: { points: { increment: 1 } },
    });

    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - updated.points),
      resetInMs: Math.max(0, bucket.expireAt.getTime() - now.getTime()),
    };
  } catch (error) {
    console.warn('[RateLimit] Database rate limit fallback to memory:', error);
    return localCheck;
  }
}

/**
 * Extracts and sanitizes client IP address, handling proxy headers securely
 */
export function getClientIp(req: Request): string {
  // If behind Cloudflare or trusted reverse proxy
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map((ip) => ip.trim());
    return ips[0] || '127.0.0.1';
  }

  return '127.0.0.1';
}
