import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { checkRateLimit } from '@/lib/auth/rateLimit';

describe('Authentication & Cryptography', () => {
  it('hashes passwords using Argon2id and verifies correctly', async () => {
    const raw = 'SecureP@ssw0rd2026!';
    const hash = await hashPassword(raw);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);

    const valid = await verifyPassword(hash, raw);
    expect(valid).toBe(true);

    const invalid = await verifyPassword(hash, 'WrongPassword123');
    expect(invalid).toBe(false);
  });

  it('enforces rate limiting on repeated requests', () => {
    const testKey = `test-ip-${Date.now()}`;
    const max = 3;
    const windowMs = 1000;

    const r1 = checkRateLimit(testKey, max, windowMs);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(testKey, max, windowMs);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(testKey, max, windowMs);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    const r4 = checkRateLimit(testKey, max, windowMs);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });
});
