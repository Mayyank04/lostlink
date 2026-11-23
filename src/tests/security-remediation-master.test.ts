import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateSafeUrl } from '@/lib/security/ssrf';
import {
  generateMfaSecret,
  generateTotp,
  verifyTotp,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
  getOtpAuthUri,
} from '@/lib/auth/mfa';
import { sanitizeUrl } from '@/lib/utils';
import { redactSensitiveData } from '@/lib/logger';
import { validateCsrfOrigin } from '@/lib/auth/csrf';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { uploadFile } from '@/lib/storage/objectStorage';
import { GET as getPrivateUpload } from '@/app/api/uploads/private/route';
import { POST as resetPasswordRoute } from '@/app/api/auth/reset-password/route';
import { POST as uploadRoute } from '@/app/api/uploads/route';
import { createSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

describe('LostLink 2.0 — Master Security Remediation & Penetration Testing Suite', () => {
  let testUserId: string;
  let testSessionToken: string;

  beforeAll(async () => {
    // Obtain or create a test user for authorized request tests
    const user = await prisma.user.findFirst({
      where: { email: 'student@apex.edu' },
    });
    if (user) {
      testUserId = user.id;
    } else {
      const newUser = await prisma.user.create({
        data: {
          name: 'Security Test Student',
          email: `sec.student.${Date.now()}@apex.edu`,
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      });
      testUserId = newUser.id;
    }

    const session = await createSession(testUserId);
    testSessionToken = session.token;
  });

  // ============================================================================
  // 1. SSRF PROTECTION & CLOUD METADATA GATING
  // ============================================================================
  describe('SSRF Protection (validateSafeUrl)', () => {
    it('rejects loopback IPv4 addresses (127.0.0.1, 127.0.1.1)', () => {
      expect(validateSafeUrl('http://127.0.0.1:8080/admin').safe).toBe(false);
      expect(validateSafeUrl('http://127.0.1.1/').safe).toBe(false);
    });

    it('rejects localhost hostname and local domain suffixes', () => {
      expect(validateSafeUrl('http://localhost:3000').safe).toBe(false);
      expect(validateSafeUrl('http://service.local').safe).toBe(false);
      expect(validateSafeUrl('http://cluster.internal').safe).toBe(false);
    });

    it('rejects cloud instance metadata endpoints (169.254.169.254)', () => {
      const res = validateSafeUrl('http://169.254.169.254/latest/meta-data/');
      expect(res.safe).toBe(false);
      expect(res.reason).toContain('169.254.169.254');
    });

    it('rejects RFC 1918 private class A, B, C addresses', () => {
      expect(validateSafeUrl('http://10.0.0.5/api').safe).toBe(false);
      expect(validateSafeUrl('http://172.16.1.10/status').safe).toBe(false);
      expect(validateSafeUrl('http://192.168.1.1/config').safe).toBe(false);
    });

    it('rejects dangerous protocols (file, gopher, ftp, data)', () => {
      expect(validateSafeUrl('file:///etc/passwd').safe).toBe(false);
      expect(validateSafeUrl('gopher://127.0.0.1:70').safe).toBe(false);
      expect(validateSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==').safe).toBe(false);
    });

    it('permits legitimate external university websites over HTTPS', () => {
      const res = validateSafeUrl('https://www.stanford.edu/admissions');
      expect(res.safe).toBe(true);
      expect(res.normalizedUrl).toBe('https://www.stanford.edu/admissions');
    });
  });

  // ============================================================================
  // 2. PATH TRAVERSAL & PRIVATE STORAGE ISOLATION
  // ============================================================================
  describe('Path Traversal & Storage Boundary Defense', () => {
    it('blocks directory traversal attempts via relative dot-dot sequences', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/uploads/private?key=../../../../etc/passwd',
        {
          headers: {
            cookie: `lostlink_session=${testSessionToken}`,
          },
        }
      );

      const res = await getPrivateUpload(req);
      // Either 403 (traversal detected) or 404 (sanitized path not on disk), never 200 with file contents
      expect(res.status).not.toBe(200);
      expect([403, 404]).toContain(res.status);
    });

    it('blocks traversal attempting to escape private storage root', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/uploads/private?key=evidence/../../package.json',
        {
          headers: {
            cookie: `lostlink_session=${testSessionToken}`,
          },
        }
      );

      const res = await getPrivateUpload(req);
      expect(res.status).not.toBe(200);
      expect([403, 404]).toContain(res.status);
    });

    it('requires authentication to access private evidence files', async () => {
      const req = new NextRequest('http://localhost:3000/api/uploads/private?key=evidence/test.png');
      const res = await getPrivateUpload(req);
      expect(res.status).toBe(401);
    });
  });

  // ============================================================================
  // 3. FILE UPLOAD INTEGRITY & MAGIC BYTES
  // ============================================================================
  describe('Insecure File Upload Protections', () => {
    it('rejects executable scripts spoofed with image extension', async () => {
      const maliciousPayload = Buffer.from('<?php echo system($_GET["cmd"]); ?>', 'utf8');

      await expect(
        uploadFile({
          buffer: maliciousPayload,
          filename: 'payload.php.jpg',
          contentType: 'image/jpeg',
        })
      ).rejects.toThrow('File contents do not match the declared image format');
    });

    it('rejects disallowed MIME types such as SVG to prevent stored XSS', async () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

      await expect(
        uploadFile({
          buffer: svgBuffer,
          filename: 'image.svg',
          contentType: 'image/svg+xml',
        })
      ).rejects.toThrow('Unsupported file type');
    });

    it('accepts genuine PNG image with real magic bytes', async () => {
      // 0x89 0x50 0x4e 0x47 (PNG signature)
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = await uploadFile({
        buffer: pngHeader,
        filename: 'valid-test.png',
        contentType: 'image/png',
        isPrivate: false,
      });

      expect(result.url).toBeDefined();
      expect(result.key).toContain('valid-test.png');
    });
  });

  // ============================================================================
  // 4. TOTP MULTI-FACTOR AUTHENTICATION (RFC 6238)
  // ============================================================================
  describe('TOTP Multi-Factor Authentication Engine', () => {
    it('generates valid RFC 3548 Base32 secret keys', () => {
      const secret = generateMfaSecret();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThanOrEqual(16);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it('computes and successfully validates a 6-digit TOTP code', () => {
      const secret = generateMfaSecret();
      const now = Date.now();
      const { code } = generateTotp(secret, now);

      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);

      const verification = verifyTotp(code, secret, { timestampMs: now });
      expect(verification.valid).toBe(true);
    });

    it('prevents code replay attack within the same time-step', () => {
      const secret = generateMfaSecret();
      const now = Date.now();
      const { code, step } = generateTotp(secret, now);

      // First verification succeeds
      const first = verifyTotp(code, secret, { timestampMs: now });
      expect(first.valid).toBe(true);

      // Replay attempt passing lastUsedStep must be rejected
      const replay = verifyTotp(code, secret, { timestampMs: now, lastUsedStep: step });
      expect(replay.valid).toBe(false);
    });

    it('rejects invalid or tampered TOTP codes', () => {
      const secret = generateMfaSecret();
      const verification = verifyTotp('999999', secret);
      expect(verification.valid).toBe(false);
    });

    it('generates and cryptographically verifies emergency recovery codes', () => {
      const codes = generateRecoveryCodes(4);
      expect(codes.length).toBe(4);

      const hashedCodes = codes.map(hashRecoveryCode);
      expect(hashedCodes[0].length).toBe(64); // SHA-256 hex string

      // Verify legitimate code
      const checkValid = verifyRecoveryCode(codes[0], hashedCodes);
      expect(checkValid.valid).toBe(true);
      expect(checkValid.matchedIndex).toBe(0);

      // Verify fake code
      const checkFake = verifyRecoveryCode('FAKE-CODE', hashedCodes);
      expect(checkFake.valid).toBe(false);
    });

    it('generates standard otpauth URI formatted for authenticator apps', () => {
      const secret = generateMfaSecret();
      const uri = getOtpAuthUri('admin@lostlink.org', 'LostLink', secret);
      expect(uri).toContain('otpauth://totp/LostLink:admin%40lostlink.org');
      expect(uri).toContain(`secret=${secret}`);
      expect(uri).toContain('algorithm=SHA1');
    });
  });

  // ============================================================================
  // 5. CSRF DEFENSE & ORIGIN VALIDATION
  // ============================================================================
  describe('CSRF Origin & Fetch-Site Validation', () => {
    it('allows read-only GET requests unconditionally', () => {
      const req = new Request('http://localhost:3000/api/items', { method: 'GET' });
      expect(validateCsrfOrigin(req).valid).toBe(true);
    });

    it('blocks cross-site mutations identified by sec-fetch-site: cross-site', () => {
      const req = new Request('http://localhost:3000/api/items', {
        method: 'POST',
        headers: {
          'sec-fetch-site': 'cross-site',
        },
      });
      const check = validateCsrfOrigin(req);
      expect(check.valid).toBe(false);
      expect(check.reason?.toLowerCase()).toContain('cross-site');
    });

    it('blocks requests where Origin host does not match request Host', () => {
      const req = new Request('http://app.lostlink.org/api/items', {
        method: 'POST',
        headers: {
          host: 'app.lostlink.org',
          origin: 'https://evil-attacker-site.com',
        },
      });
      const check = validateCsrfOrigin(req);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('Origin host mismatch');
    });

    it('allows same-origin mutation requests', () => {
      const req = new Request('http://localhost:3000/api/items', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
      });
      expect(validateCsrfOrigin(req).valid).toBe(true);
    });
  });

  // ============================================================================
  // 6. XSS URL PROTOCOL SANITIZATION
  // ============================================================================
  describe('XSS URL Protocol Sanitizer (sanitizeUrl)', () => {
    it('neutralizes javascript: pseudo-protocol payloads', () => {
      expect(sanitizeUrl('javascript:alert(document.cookie)')).toBe('#');
      expect(sanitizeUrl('  javascript:alert(1)  ')).toBe('#');
      expect(sanitizeUrl('JAVASCRIPT:void(0)')).toBe('#');
    });

    it('neutralizes data: URI HTML payloads', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
    });

    it('neutralizes vbscript: and unapproved protocols', () => {
      expect(sanitizeUrl('vbscript:msgbox("XSS")')).toBe('#');
    });

    it('preserves legitimate internal relative paths', () => {
      expect(sanitizeUrl('/claims/clm-123')).toBe('/claims/clm-123');
      expect(sanitizeUrl('/dashboard?tab=items')).toBe('/dashboard?tab=items');
    });

    it('preserves legitimate absolute HTTPS URLs', () => {
      expect(sanitizeUrl('https://university.edu/lostfound')).toBe('https://university.edu/lostfound');
    });
  });

  // ============================================================================
  // 7. SENSITIVE DATA REDACTION IN LOGS
  // ============================================================================
  describe('Sensitive Data Redaction (redactSensitiveData)', () => {
    it('redacts passwords, tokens, secrets, and OTPs from log payloads', () => {
      const payload = {
        email: 'student@apex.edu',
        password: 'PlainTextPassword123!',
        token: 'secret-session-token-xyz',
        rawOtp: '123456',
        profile: {
          apiKey: 'key_live_1234567890',
        },
      };

      const redacted = redactSensitiveData(payload);
      expect(redacted.email).toBe('student@apex.edu');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.rawOtp).toBe('[REDACTED]');
      expect(redacted.profile.apiKey).toBe('[REDACTED]');
    });

    it('redacts Authorization Bearer tokens in string logs', () => {
      const logMessage = 'Request with Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123';
      const sanitized = redactSensitiveData(logMessage);
      expect(sanitized).toBe('Request with Authorization: Bearer [REDACTED]');
    });

    it('redacts database passwords in connection strings', () => {
      const dbUrl = 'postgresql://admin:SecretPass123!@db.host.com:5432/lostlink';
      const sanitized = redactSensitiveData(dbUrl);
      expect(sanitized).toBe('postgresql://admin:[REDACTED]@db.host.com:5432/lostlink');
    });
  });

  // ============================================================================
  // 8. RATE LIMITING ENFORCEMENT
  // ============================================================================
  describe('Rate Limiting Protections', () => {
    it('enforces limit threshold and returns allowed=false upon exhaustion', () => {
      const testKey = `test-rate-${Date.now()}`;
      const limit = 3;
      const windowMs = 5000;

      expect(checkRateLimit(testKey, limit, windowMs).allowed).toBe(true);
      expect(checkRateLimit(testKey, limit, windowMs).allowed).toBe(true);
      expect(checkRateLimit(testKey, limit, windowMs).allowed).toBe(true);

      const exhausted = checkRateLimit(testKey, limit, windowMs);
      expect(exhausted.allowed).toBe(false);
      expect(exhausted.remaining).toBe(0);
      expect(exhausted.resetInMs).toBeGreaterThan(0);
    });

    it('returns HTTP 429 when reset-password attempts exceed limit', async () => {
      const ipKey = `reset-pass:192.0.2.1`;
      // Exhaust rate limit for this IP
      for (let i = 0; i < 5; i++) {
        checkRateLimit(ipKey, 5, 60000);
      }

      const req = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.0.2.1',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ token: 'fake-token', password: 'newpassword123' }),
      });

      const res = await resetPasswordRoute(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain('Too many password reset attempts');
    });
  });
});
