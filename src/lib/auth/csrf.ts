import { NextRequest } from 'next/server';

/**
 * Validates Origin and Sec-Fetch-Site headers on state-changing requests to prevent CSRF
 */
export function validateCsrfOrigin(req: Request | NextRequest): { valid: boolean; reason?: string } {
  const method = req.method.toUpperCase();

  // Safe read-only HTTP methods are exempt from CSRF checks
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // 1. Check Sec-Fetch-Site header (modern browsers)
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    return { valid: false, reason: 'Cross-site request blocked by Sec-Fetch-Site policy' };
  }

  // 2. Validate Origin header
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      // Origin host must match request Host
      if (originUrl.host !== host) {
        // In local development, permit localhost ports
        if (
          process.env.NODE_ENV !== 'production' &&
          originUrl.hostname === 'localhost' &&
          (host.startsWith('localhost') || host.startsWith('127.0.0.1'))
        ) {
          return { valid: true };
        }
        return { valid: false, reason: `Origin host mismatch: ${originUrl.host} vs ${host}` };
      }
    } catch {
      return { valid: false, reason: 'Malformed Origin header' };
    }
  }

  return { valid: true };
}
