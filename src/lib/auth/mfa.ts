import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer to RFC 3548 Base32
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes an RFC 3548 Base32 string to a Buffer
 */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${cleaned[i]}`);
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a new 20-byte cryptographically secure TOTP secret key in Base32
 */
export function generateMfaSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Computes an RFC 6238 TOTP code for a given timestamp and secret
 */
export function generateTotp(
  secret: string,
  timestampMs = Date.now(),
  stepSeconds = 30
): { code: string; step: number } {
  const key = base32Decode(secret);
  const step = Math.floor(timestampMs / 1000 / stepSeconds);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(step));

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  const code = otp.toString().padStart(6, '0');

  return { code, step };
}

/**
 * Verifies a submitted 6-digit TOTP code with time-drift window and anti-replay protection
 */
export function verifyTotp(
  token: string,
  secret: string,
  options: {
    window?: number; // allowed steps before and after (default: 1 step = ±30s)
    timestampMs?: number;
    lastUsedStep?: number;
  } = {}
): { valid: boolean; matchedStep?: number } {
  const normalized = token.trim();
  if (!/^\d{6}$/.test(normalized)) {
    return { valid: false };
  }

  const window = options.window ?? 1;
  const now = options.timestampMs ?? Date.now();
  const currentStep = Math.floor(now / 1000 / 30);

  for (let offset = -window; offset <= window; offset++) {
    const candidateStep = currentStep + offset;

    // Prevent token replay within the same or older time-step
    if (options.lastUsedStep !== undefined && candidateStep <= options.lastUsedStep) {
      continue;
    }

    const { code } = generateTotp(secret, candidateStep * 30 * 1000);
    const codeBuf = Buffer.from(code, 'utf8');
    const tokenBuf = Buffer.from(normalized, 'utf8');

    if (codeBuf.length === tokenBuf.length && crypto.timingSafeEqual(codeBuf, tokenBuf)) {
      return { valid: true, matchedStep: candidateStep };
    }
  }

  return { valid: false };
}

/**
 * Generates an array of single-use emergency recovery codes (e.g. "A1B2-C3D4")
 */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

/**
 * Hashes a recovery code using SHA-256 for safe database storage
 */
export function hashRecoveryCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/[^A-F0-9]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Validates a recovery code against an array of stored SHA-256 hashes
 */
export function verifyRecoveryCode(
  inputCode: string,
  hashedCodes: string[]
): { valid: boolean; matchedIndex?: number } {
  const targetHash = hashRecoveryCode(inputCode);
  const targetBuf = Buffer.from(targetHash, 'hex');

  for (let i = 0; i < hashedCodes.length; i++) {
    const storedBuf = Buffer.from(hashedCodes[i], 'hex');
    if (storedBuf.length === targetBuf.length && crypto.timingSafeEqual(storedBuf, targetBuf)) {
      return { valid: true, matchedIndex: i };
    }
  }

  return { valid: false };
}

/**
 * Generates the standard standard otpauth:// URI for QR code generation
 */
export function getOtpAuthUri(
  accountEmail: string,
  issuer: string,
  secret: string
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountEmail);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}
