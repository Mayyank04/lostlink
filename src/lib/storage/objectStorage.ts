import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadOptions {
  buffer: Buffer;
  filename: string;
  contentType: string;
  isPrivate?: boolean;
  prefix?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
  isPrivate: boolean;
}

function sanitizeFilename(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${base}${ext}`;
}

function getS3Client(): S3Client | null {
  const provider = process.env.STORAGE_PROVIDER || 'local';
  if (provider === 'local') return null;

  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || 'auto';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.warn('S3 credentials not configured; falling back to local filesystem storage.');
    return null;
  }

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: provider === 's3' && (endpoint?.includes('localhost') || endpoint?.includes('127.0.0.1')),
  });
}

/**
 * Uploads a file using the configured storage engine (Local disk, S3, or R2)
 */
export async function uploadFile({
  buffer,
  filename,
  contentType,
  isPrivate = false,
  prefix = 'uploads',
}: UploadOptions): Promise<UploadResult> {
  // 1. Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error(`Unsupported file type: ${contentType}. Allowed types: JPEG, PNG, WebP.`);
  }

  // 2. Validate file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size (${(buffer.length / 1024 / 1024).toFixed(2)} MB) exceeds 10MB limit.`);
  }

  // 3. Generate sanitized unique key
  const sanitized = sanitizeFilename(filename);
  const ext = path.extname(sanitized);
  const baseName = path.basename(sanitized, ext);
  const uniqueId = crypto.randomUUID();
  const datePrefix = new Date().toISOString().slice(0, 10);
  const key = `${prefix}/${datePrefix}/${uniqueId}_${baseName}${ext}`;

  const s3Client = getS3Client();
  const bucket = process.env.S3_BUCKET_NAME || 'lostlink-storage';

  if (s3Client) {
    // S3 or Cloudflare R2 Upload
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // If private, leave off public ACL
        ...(isPrivate ? {} : { ACL: 'public-read' }),
      })
    );

    let url: string;
    if (isPrivate) {
      // Generate 1-hour signed URL
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } else {
      const publicBase = process.env.S3_PUBLIC_URL || `https://${bucket}.s3.amazonaws.com`;
      url = `${publicBase.replace(/\/$/, '')}/${key}`;
    }

    return {
      url,
      key,
      size: buffer.length,
      contentType,
      isPrivate,
    };
  }

  // Local filesystem fallback
  const publicDir = path.join(process.cwd(), 'public');
  const targetDir = path.join(publicDir, prefix, datePrefix);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, `${uniqueId}${ext}`);
  fs.writeFileSync(filePath, buffer);

  const url = `/${prefix}/${datePrefix}/${uniqueId}${ext}`;

  return {
    url,
    key,
    size: buffer.length,
    contentType,
    isPrivate,
  };
}

/**
 * Generates an authorized access URL for private files (e.g. proof of purchase, student ID cards)
 */
export async function getFileAccessUrl(key: string, isPrivate = false): Promise<string> {
  const s3Client = getS3Client();
  const bucket = process.env.S3_BUCKET_NAME || 'lostlink-storage';

  if (s3Client && isPrivate) {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
  }

  if (s3Client && !isPrivate) {
    const publicBase = process.env.S3_PUBLIC_URL || `https://${bucket}.s3.amazonaws.com`;
    return `${publicBase.replace(/\/$/, '')}/${key}`;
  }

  // Local fallback
  return `/${key}`;
}
