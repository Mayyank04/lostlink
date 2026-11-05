import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getEncryptionKey(): Buffer {
  const secret =
    process.env.EVIDENCE_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    'lostlink_default_evidence_encryption_key_32bytes_min';

  // Derive deterministic 256-bit (32 bytes) key using SHA-256
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedPayload {
  v: number;
  iv: string; // hex
  tag: string; // hex
  data: string; // hex
}

/**
 * Encrypts sensitive ownership evidence (serial numbers, proof receipts, notes)
 * using AES-256-GCM authenticated encryption at rest.
 */
export function encryptEvidence(data: any): string {
  if (!data) return '';
  const plainText = typeof data === 'string' ? data : JSON.stringify(data);
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  const payload: EncryptedPayload = {
    v: 1,
    iv: iv.toString('hex'),
    tag,
    data: encrypted,
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts authenticated AES-256-GCM evidence payloads.
 * Supports backward-compatible graceful fallback for legacy plaintext records.
 */
export function decryptEvidence(rawCipher: string): any {
  if (!rawCipher) return null;

  try {
    const parsed = JSON.parse(rawCipher);

    // If payload follows encrypted schema (v: 1, iv, tag, data)
    if (parsed && parsed.v === 1 && parsed.iv && parsed.tag && parsed.data) {
      const key = getEncryptionKey();
      const iv = Buffer.from(parsed.iv, 'hex');
      const tag = Buffer.from(parsed.tag, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(parsed.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    }

    // Legacy unencrypted JSON fallback
    return parsed;
  } catch {
    // Return raw string if not JSON
    return rawCipher;
  }
}

