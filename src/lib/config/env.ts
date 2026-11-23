import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/lostlink_dev?schema=public'),
  AUTH_SECRET: z
    .string()
    .default('dev_secret_lostlink_session_key_32_bytes_min_12345'),
  SESSION_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  SESSION_EXPIRY_DAYS: z.coerce.number().default(7),
  EVIDENCE_ENCRYPTION_KEY: z
    .string()
    .default('dev_evidence_key_32_bytes_min_1234567890'),
  STORAGE_PROVIDER: z.enum(['local', 's3', 'r2']).default('local'),
  STORAGE_BUCKET_NAME: z.string().default('lostlink-media'),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().optional(),
  EMAIL_PROVIDER: z.string().default('test'),
  EMAIL_FROM: z.string().default('noreply@lostlink.org'),
  NEXT_PUBLIC_DEMO_MODE: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: Environment validation failed in production:');
      console.error(result.error.format());
      throw new Error('Invalid environment configuration');
    }
    // In dev or test, return defaults with warnings
    return envSchema.parse({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lostlink_dev?schema=public',
      AUTH_SECRET: process.env.AUTH_SECRET || 'dev_secret_lostlink_session_key_32_bytes_min_12345',
    });
  }
  return result.data;
}

export const env = loadEnv();
