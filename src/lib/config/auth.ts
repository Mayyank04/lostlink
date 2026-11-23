import { env } from './env';

export const authConfig = {
  cookieName: 'lostlink_session',
  sessionDurationDays: env.SESSION_EXPIRY_DAYS,
  sessionDurationSeconds: env.SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  secretKey: env.AUTH_SECRET || env.SESSION_SECRET || 'dev_secret_lostlink_session_key_32_bytes_min_12345',
  argon2Options: {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  },
  otp: {
    expiryMinutes: 10,
    length: 6,
    resendCooldownSeconds: 60,
  },
} as const;
