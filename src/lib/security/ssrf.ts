import { URL } from 'url';

// Private and restricted IPv4 address patterns
const PRIVATE_IP_PATTERNS = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.0.0.0/8 (Loopback)
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8 (Private)
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12 (Private)
  /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.0.0/16 (Private)
  /^169\.254\.\d{1,3}\.\d{1,3}$/, // 169.254.0.0/16 (Link-local / Cloud metadata: AWS, GCP, Azure)
  /^0\.0\.0\.0$/, // Current network
];

// Restricted hostname keywords
const RESTRICTED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
]);

export interface SafeUrlCheckResult {
  safe: boolean;
  reason?: string;
  normalizedUrl?: string;
}

/**
 * Validates a URL against Server-Side Request Forgery (SSRF) risks:
 * - Restricts protocol to HTTP / HTTPS
 * - Rejects loopback (127.0.0.1, localhost, ::1)
 * - Rejects private RFC 1918 ranges (10.x, 172.16-31.x, 192.168.x)
 * - Rejects cloud provider instance metadata endpoints (169.254.169.254)
 * - Rejects non-standard ports where configured
 */
export function validateSafeUrl(
  inputUrl: string,
  options: {
    allowedProtocols?: string[];
    allowedPorts?: number[];
    allowedDomains?: string[];
  } = {}
): SafeUrlCheckResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { safe: false, reason: 'Empty or invalid URL input' };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    return { safe: false, reason: 'Malformed URL' };
  }

  const allowedProtocols = options.allowedProtocols || ['https:', 'http:'];
  if (!allowedProtocols.includes(parsed.protocol)) {
    return {
      safe: false,
      reason: `Disallowed protocol: ${parsed.protocol}. Only ${allowedProtocols.join(', ')} permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check restricted hostnames
  if (RESTRICTED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { safe: false, reason: `Restricted internal hostname: ${hostname}` };
  }

  // Check IPv6 loopback
  if (hostname === '[::1]' || hostname === '::1') {
    return { safe: false, reason: 'IPv6 loopback address rejected' };
  }

  // Check IPv4 private ranges
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { safe: false, reason: `Private/link-local IPv4 address rejected: ${hostname}` };
    }
  }

  // Restrict ports if specified (default: 80, 443)
  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
  const allowedPorts = options.allowedPorts || [80, 443];
  if (!allowedPorts.includes(port)) {
    return { safe: false, reason: `Non-standard port rejected: ${port}` };
  }

  // Domain allowlist check if specified
  if (options.allowedDomains && options.allowedDomains.length > 0) {
    const isDomainAllowed = options.allowedDomains.some(
      (d) => hostname === d.toLowerCase() || hostname.endsWith(`.${d.toLowerCase()}`)
    );
    if (!isDomainAllowed) {
      return { safe: false, reason: `Domain ${hostname} is not in the approved allowlist` };
    }
  }

  return { safe: true, normalizedUrl: parsed.toString() };
}
