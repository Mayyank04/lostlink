import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { createSession, getCurrentUser, extractTokenFromRequest } from '@/lib/auth/session';
import { GET as getMeRoute } from '@/app/api/auth/me/route';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Webpack Chunk & Session Runtime Integration Test', () => {
  let testUser: any;
  let testCollege: any;

  beforeAll(async () => {
    testCollege = await prisma.college.upsert({
      where: { slug: 'webpack-test-univ' },
      update: {},
      create: {
        name: 'Webpack Test University',
        slug: 'webpack-test-univ',
        status: 'ACTIVE',
        city: 'Cambridge',
        state: 'MA',
        domainVerificationStatus: 'VERIFIED',
      },
    });

    testUser = await prisma.user.upsert({
      where: { email: 'student@webpack-test.edu' },
      update: {},
      create: {
        email: 'student@webpack-test.edu',
        name: 'Webpack Chunk Tester',
        passwordHash: await hashPassword('TestSecurePassword123!'),
        role: 'STUDENT',
        status: 'ACTIVE',
        memberships: {
          create: {
            collegeId: testCollege.id,
            status: 'VERIFIED',
            verifiedAt: new Date(),
          },
        },
      },
      include: {
        memberships: {
          include: {
            college: true,
          },
        },
      },
    });
  });

  it('resolves native argon2 hashing and verification without webpack chunk errors', async () => {
    const password = 'NativeModulePassword456!';
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2')).toBe(true);

    const isValid = await verifyPassword(hash, password);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword(hash, 'WrongPassword');
    expect(isInvalid).toBe(false);
  });

  it('unauthenticated GET /api/auth/me returns 200 with null user without chunk errors', async () => {
    const req = new Request('http://localhost:3000/api/auth/me', {
      method: 'GET',
    });

    const res = await getMeRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('user');
    expect(data.user).toBeNull();
  });

  it('authenticated GET /api/auth/me with Bearer token successfully resolves user session', async () => {
    const { token } = await createSession(testUser.id);
    expect(token).toBeDefined();

    const req = new Request('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const res = await getMeRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.id).toBe(testUser.id);
    expect(data.user.email).toBe('student@webpack-test.edu');
    expect(data.user.role).toBe('STUDENT');
    expect(data.user.memberships.length).toBeGreaterThan(0);
  });

  it('authenticated GET /api/auth/me with Cookie header successfully resolves user session', async () => {
    const { token } = await createSession(testUser.id);

    const req = new Request('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        cookie: `lostlink_session=${token}`,
      },
    });

    const res = await getMeRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.id).toBe(testUser.id);
  });

  it('handles malformed or forged session tokens gracefully with null user', async () => {
    const req = new Request('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        authorization: 'Bearer forged.invalid.token.signature',
      },
    });

    const res = await getMeRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user).toBeNull();
  });
});
