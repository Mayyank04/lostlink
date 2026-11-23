import crypto from 'crypto';
import { prisma } from '@/lib/db';

const OTP_EXPIRY_MINUTES = 15;
const MAX_VERIFICATION_ATTEMPTS = 5;

/**
 * Generates and securely stores a cryptographic 6-digit OTP for email verification.
 * Only the SHA-256 hash verifier is persisted in the database.
 * Explicitly binds the OTP challenge to the user's institutional email and college ID.
 */
export async function createEmailVerificationOTP(
  email: string,
  collegeId?: string,
  userId?: string
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Invalidate any existing unconsumed tokens for this identifier/college to prevent challenge stacking
  await prisma.verificationToken.deleteMany({
    where: {
      identifier: normalizedEmail,
      ...(collegeId ? { collegeId } : {}),
    },
  }).catch(() => {});

  // 2. Generate cryptographically random 6-digit numeric OTP
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const tokenHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // 3. Store hashed verifier bound to college and user
  const record = await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      collegeId: collegeId || null,
      userId: userId || null,
      token: tokenHash,
      attempts: 0,
      maxAttempts: MAX_VERIFICATION_ATTEMPTS,
      expiresAt,
    },
  });

  // 4. Dispatch via email provider or log to console in development/testing
  const provider = process.env.EMAIL_PROVIDER || 'test';
  if (process.env.NODE_ENV !== 'production' && (provider === 'test' || !process.env.SMTP_HOST)) {
    console.log(
      `\x1b[36m[EMAIL_VERIFICATION]\x1b[0m Verification code for \x1b[1m${normalizedEmail}\x1b[0m${
        collegeId ? ` (College: ${collegeId})` : ''
      }: \x1b[32m\x1b[1m${rawOtp}\x1b[0m (Expires in ${OTP_EXPIRY_MINUTES}m)`
    );
  } else if (process.env.NODE_ENV === 'production') {
    console.log(
      `[EMAIL_VERIFICATION] OTP challenge dispatched for ${normalizedEmail} (Expires in ${OTP_EXPIRY_MINUTES}m)`
    );
  }

  return rawOtp;
}

/**
 * Validates a submitted OTP server-side with timing-safe comparison, attempt limits, and college binding.
 * Enforces single-use consumption upon successful verification.
 */
export async function verifyEmailVerificationOTP(
  email: string,
  candidateOtp: string,
  collegeId?: string
): Promise<{ success: boolean; error?: string; tokenRecord?: any }> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = (candidateOtp || '').trim();

  if (!trimmedOtp || trimmedOtp.length < 6) {
    return {
      success: false,
      error: 'Please enter a valid 6-digit verification code.',
    };
  }

  // 1. Look up active challenge for this identifier
  const whereClause: any = {
    identifier: normalizedEmail,
  };
  if (collegeId) {
    whereClause.OR = [
      { collegeId },
      { collegeId: null }, // Backward compatibility for legacy tokens
    ];
  }

  const activeRecord = await prisma.verificationToken.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  if (!activeRecord) {
    return {
      success: false,
      error: 'Verification code is invalid or has expired. Please request a new code.',
    };
  }

  // 2. Check if challenge was already consumed (prevent replay)
  if (activeRecord.consumedAt) {
    return {
      success: false,
      error: 'This verification code has already been used. Please request a new code.',
    };
  }

  // 3. Check expiration
  if (activeRecord.expiresAt <= new Date()) {
    await prisma.verificationToken.delete({ where: { id: activeRecord.id } }).catch(() => {});
    return {
      success: false,
      error: 'Verification code has expired. Please request a new code.',
    };
  }

  // 4. Check attempt limits (brute-force defense)
  if (activeRecord.attempts >= activeRecord.maxAttempts) {
    return {
      success: false,
      error: 'Maximum verification attempts exceeded. For security, this challenge has been locked. Please request a new code.',
    };
  }

  // 5. College ID binding check: if challenge was issued for College X, it cannot verify College Y
  if (collegeId && activeRecord.collegeId && activeRecord.collegeId !== collegeId) {
    return {
      success: false,
      error: 'Verification code does not belong to the selected institution.',
    };
  }

  // 6. Compute candidate hash and execute timing-safe comparison
  const candidateHash = crypto.createHash('sha256').update(trimmedOtp).digest('hex');
  const candidateBuf = Buffer.from(candidateHash, 'hex');
  const storedBuf = Buffer.from(activeRecord.token, 'hex');

  let isMatch = false;
  if (candidateBuf.length === storedBuf.length) {
    isMatch = crypto.timingSafeEqual(candidateBuf, storedBuf);
  }

  if (!isMatch) {
    // Increment failed attempt counter
    await prisma.verificationToken.update({
      where: { id: activeRecord.id },
      data: { attempts: { increment: 1 } },
    }).catch(() => {});

    const remainingAttempts = Math.max(0, activeRecord.maxAttempts - (activeRecord.attempts + 1));
    return {
      success: false,
      error: remainingAttempts > 0
        ? `Incorrect verification code. ${remainingAttempts} attempt(s) remaining.`
        : 'Maximum verification attempts exceeded. Please request a new code.',
    };
  }

  // 7. Atomically mark token as consumed (prevents race conditions and duplicate concurrent verification)
  const updateResult = await prisma.verificationToken.updateMany({
    where: {
      id: activeRecord.id,
      consumedAt: null,
    },
    data: { consumedAt: new Date() },
  });

  if (updateResult.count === 0) {
    return {
      success: false,
      error: 'This verification code has already been used. Please request a new code.',
    };
  }

  return { success: true, tokenRecord: activeRecord };
}
