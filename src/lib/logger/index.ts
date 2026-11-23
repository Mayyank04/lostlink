/**
 * Enterprise Redaction Logger
 * Sanitizes sensitive fields (passwords, tokens, OTPs, session cookies, auth headers) before output
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'sessiontoken',
  'secret',
  'auth_secret',
  'session_secret',
  'code',
  'otp',
  'codehash',
  'rawotp',
  'authorization',
  'cookie',
  'set-cookie',
  'apikey',
  'accesskey',
  'secretaccesskey',
]);

/**
 * Deeply redacts sensitive fields from objects or JSON-serializable payloads
 */
export function redactSensitiveData<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact bearer tokens
    let sanitized = data.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]');
    // Redact passwords in connection strings
    sanitized = sanitized.replace(/(:\/\/[^:]+:)([^@]+)(@)/g, '$1[REDACTED]$3');
    return sanitized as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      const lower = key.toLowerCase().replace(/[^a-z]/g, '');
      if (SENSITIVE_KEYS.has(lower)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redactSensitiveData(value);
      } else if (typeof value === 'string') {
        result[key] = redactSensitiveData(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return data;
}

export const logger = {
  info(message: string, meta?: any) {
    if (meta !== undefined) {
      console.log(`[INFO] ${message}`, redactSensitiveData(meta));
    } else {
      console.log(`[INFO] ${message}`);
    }
  },

  warn(message: string, meta?: any) {
    if (meta !== undefined) {
      console.warn(`[WARN] ${message}`, redactSensitiveData(meta));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  error(message: string, error?: any) {
    if (error !== undefined) {
      if (error instanceof Error) {
        console.error(`[ERROR] ${message}: ${error.message}`);
      } else {
        console.error(`[ERROR] ${message}`, redactSensitiveData(error));
      }
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },
};
