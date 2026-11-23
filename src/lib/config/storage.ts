import { env } from './env';

export const storageConfig = {
  provider: env.STORAGE_PROVIDER,
  bucketName: env.STORAGE_BUCKET_NAME,
  endpoint: env.STORAGE_ENDPOINT,
  accessKeyId: env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  publicUrl: env.STORAGE_PUBLIC_URL || '/uploads',
  maxUploadSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
} as const;
