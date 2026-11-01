import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit numeric OTP
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Generates a cryptographically secure URL-safe QR token
 */
export function generateQrToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Computes SHA-256 digest hex of a token or OTP
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Timing-safe comparison of a candidate token against a stored SHA-256 hash
 */
export function verifyTokenHash(candidateToken: string, storedHash: string): boolean {
  try {
    const candidateHash = hashToken(candidateToken);
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');

    if (candidateBuf.length !== storedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(candidateBuf, storedBuf);
  } catch {
    return false;
  }
}
