import crypto from 'crypto';
import { prisma } from '@/lib/db';

const OTP_EXPIRY_MINUTES = 15;

/**
 * Generates and securely stores a cryptographic 6-digit OTP for email verification.
 * Only the SHA-256 hash verifier is persisted in the database.
 */
export async function createEmailVerificationOTP(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Generate 6-digit numeric OTP
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const tokenHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // 2. Remove any previous tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: normalizedEmail },
  }).catch(() => {});

  // 3. Store hashed verifier
  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token: tokenHash,
      expiresAt,
    },
  });

  // 4. Dispatch via email provider or log to console in development
  const provider = process.env.EMAIL_PROVIDER || 'test';
  if (provider === 'test' || process.env.NODE_ENV !== 'production') {
    console.log(
      `\x1b[36m[EMAIL_VERIFICATION]\x1b[0m Verification code for \x1b[1m${normalizedEmail}\x1b[0m: \x1b[32m\x1b[1m${rawOtp}\x1b[0m (Expires in ${OTP_EXPIRY_MINUTES}m)`
    );
  }

  return rawOtp;
}

/**
 * Validates a submitted OTP server-side with timing-safe comparison.
 * Consumes the token upon successful verification to prevent replay attacks.
 */
export async function verifyEmailVerificationOTP(
  email: string,
  candidateOtp: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = (candidateOtp || '').trim();

  if (!trimmedOtp || trimmedOtp.length < 6) {
    return {
      success: false,
      error: 'Please enter a valid 6-digit verification code.',
    };
  }

  // 1. Look up active token for this identifier
  const activeRecord = await prisma.verificationToken.findFirst({
    where: {
      identifier: normalizedEmail,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!activeRecord) {
    return {
      success: false,
      error: 'Verification code is invalid or has expired. Please request a new code.',
    };
  }

  // 2. Compute candidate hash and execute timing-safe comparison
  const candidateHash = crypto.createHash('sha256').update(trimmedOtp).digest('hex');
  const candidateBuf = Buffer.from(candidateHash, 'hex');
  const storedBuf = Buffer.from(activeRecord.token, 'hex');

  let isMatch = false;
  if (candidateBuf.length === storedBuf.length) {
    isMatch = crypto.timingSafeEqual(candidateBuf, storedBuf);
  }

  if (!isMatch) {
    return {
      success: false,
      error: 'Incorrect verification code. Please check your inbox and try again.',
    };
  }

  // 3. Consume token on success (single-use enforcement)
  await prisma.verificationToken.delete({
    where: { id: activeRecord.id },
  }).catch(() => {});

  return { success: true };
}

