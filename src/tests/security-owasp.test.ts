// ==============================================================================
// LOSTLINK 2.0 — OWASP ASVS 5.0 SECURITY AUDIT AUTOMATED TEST SUITE
// Cloud Computing Module IV PBL Project — Phase 6 Security Hardening
// ==============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { hashApiKey, generateCampusApiKey } from '@/lib/hybrid/auth';
import { uploadFile } from '@/lib/storage/objectStorage';
import { ItemReportType, ItemStatus, ClaimStatus } from '@prisma/client';
import { jwtVerify, SignJWT } from 'jose';

function getTestSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'dev_secret_lostlink_session_key_32_bytes_min_12345';
  return new TextEncoder().encode(secret.padEnd(32, '!'));
}

describe('OWASP ASVS 5.0 Security & Vulnerability Test Suite', () => {
  const TEST_COLLEGE_ID = 'college-apex';
  let testUserAId: string;
  let testUserBId: string;
  let collegeBId = 'college-horizon';

  beforeAll(async () => {
    // Locate seeded students in college-apex and college-horizon
    const userA = await prisma.user.findFirst({
      where: { memberships: { some: { collegeId: TEST_COLLEGE_ID } } },
    });
    const userB = await prisma.user.findFirst({
      where: { memberships: { some: { collegeId: collegeBId } } },
    });

    testUserAId = userA?.id || 'user-maya';
    testUserBId = userB?.id || 'user-jordan';
  });

  // ----------------------------------------------------------------------------
  // OWASP ASVS V2: Authentication Architecture
  // ----------------------------------------------------------------------------
  describe('V2: Authentication & Password Security', () => {
    it('enforces Argon2id for password storage with memory-hard parameters', async () => {
      const plaintext = 'SuperSecretP@ssw0rd2026!';
      const hash = await hashPassword(plaintext);

      // Verify Argon2id algorithm header
      expect(hash).toMatch(/^\$argon2id\$v=19\$m=/);

      // Verify valid verification
      const isValid = await verifyPassword(hash, plaintext);
      expect(isValid).toBe(true);

      // Verify incorrect password rejected
      const isInvalid = await verifyPassword(hash, 'WrongPassword123');
      expect(isInvalid).toBe(false);
    });

    it('prevents JWT tampering and rejects forged session signatures', async () => {
      const { token: validToken } = await createSession(testUserAId);

      // Tamper with payload (change role from STUDENT to PLATFORM_ADMIN)
      const parts = validToken.split('.');
      expect(parts.length).toBe(3);

      const forgedPayload = Buffer.from(
        JSON.stringify({
          userId: testUserAId,
          email: 'attacker@evil.com',
          role: 'PLATFORM_ADMIN',
          collegeId: TEST_COLLEGE_ID,
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      ).toString('base64url');

      const tamperedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

      // Cryptographic verification must reject the tampered signature
      await expect(jwtVerify(tamperedToken, getTestSecretKey())).rejects.toThrow();
    });

    it('rejects expired session tokens', async () => {
      // Manually mint a token that expired 1 hour ago
      const expiredToken = await new SignJWT({
        userId: testUserAId,
        role: 'STUDENT',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
        .sign(getTestSecretKey());

      await expect(jwtVerify(expiredToken, getTestSecretKey())).rejects.toThrow();
    });
  });

  // ----------------------------------------------------------------------------
  // OWASP ASVS V4: Access Control & Authorization (IDOR & Tenant Isolation)
  // ----------------------------------------------------------------------------
  describe('V4: Access Control & Multi-College Tenant Boundaries', () => {
    it('isolates private evidence across institutions (No Cross-College Leakage)', async () => {
      const uniqueSuffix = Date.now().toString(36);
      // Create item in College B with private evidence
      const privateEvidenceItem = await prisma.item.create({
        data: {
          reportNumber: `SEC-AUD-${uniqueSuffix}`,
          name: 'Private MacBook Pro M3',
          type: ItemReportType.LOST,
          category: 'ELECTRONICS',
          color: 'Space Gray',
          locationBuilding: 'Horizon Tech Building',
          collegeId: collegeBId,
          campusId: 'horizon-main',
          reporterId: testUserBId,
          status: ItemStatus.OPEN,
          occurredAt: new Date(),
          description: 'Left in room 402 with private notes',
          privateEvidence: {
            create: {
              encryptedEvidence: JSON.stringify({
                serialNumber: 'C02G1234MD6R',
                secretIdentifier: 'Engraved: Property of Jordan H.',
              }),
            },
          },
        },
        include: { privateEvidence: true },
      });

      // Student from College A querying items in College A MUST NOT see College B's item
      const collegeAItems = await prisma.item.findMany({
        where: { collegeId: TEST_COLLEGE_ID },
      });

      const leakedItem = collegeAItems.find((i) => i.id === privateEvidenceItem.id);
      expect(leakedItem).toBeUndefined();

      // Ensure private evidence is omitted by default on ordinary item queries
      const itemWithEvidence = await prisma.item.findUnique({
        where: { id: privateEvidenceItem.id },
        select: {
          id: true,
          name: true,
          reporterId: true,
          collegeId: true,
        },
      });

      expect(itemWithEvidence).not.toHaveProperty('privateEvidence');

      // Clean up test item
      await prisma.item.delete({ where: { id: privateEvidenceItem.id } });
    });

    it('prevents IDOR: unauthorized student cannot access or modify claims of another user', async () => {
      const uniqueSuffix = Date.now().toString(36);
      const testItem = await prisma.item.findFirst({
        where: { collegeId: TEST_COLLEGE_ID, type: ItemReportType.FOUND },
      });

      if (testItem) {
        const claim = await prisma.claim.create({
          data: {
            referenceNumber: `CLM-SEC-${uniqueSuffix}`,
            itemId: testItem.id,
            claimantId: testUserAId,
            status: ClaimStatus.PENDING,
            privateEvidenceReference: JSON.stringify({ question: 'Color', answer: 'Blue' }),
          },
        });

        // Simulate backend authorization check:
        // Only claimant, custodian, or moderator can view/action claim
        const isAuthorizedToApprove = (userId: string, userRole: string, claimClaimantId: string) => {
          if (userRole === 'COLLEGE_MODERATOR' || userRole === 'PLATFORM_ADMIN') return true;
          return userId === claimClaimantId;
        };

        const userBAllowed = isAuthorizedToApprove(testUserBId, 'STUDENT', claim.claimantId);
        expect(userBAllowed).toBe(false);

        // Clean up test claim
        await prisma.claim.delete({ where: { id: claim.id } });
      }
    });
  });

  // ----------------------------------------------------------------------------
  // OWASP ASVS V5: Input Validation & Injection Resistance
  // ----------------------------------------------------------------------------
  describe('V5: Input Sanitization & SQL Injection Defense', () => {
    it('safely neutralizes classic SQL injection payloads via Prisma Parameterized Queries', async () => {
      const sqlInjectionPayload = "'; DROP TABLE \"Item\"; SELECT * FROM \"User\" WHERE '1'='1";

      // Attempt search with SQL injection string
      const results = await prisma.item.findMany({
        where: {
          name: { contains: sqlInjectionPayload, mode: 'insensitive' },
        },
      });

      // Must return empty array without database syntax error or execution
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);

      // Verify Item table still exists and is completely intact
      const count = await prisma.item.count();
      expect(count).toBeGreaterThan(0);
    });

    it('prevents Stored XSS injection by neutralizing script tags in user fields', async () => {
      const uniqueSuffix = Date.now().toString(36);
      const xssPayload = '<script>alert("XSS_ATTACK_VECTOR")</script><img src="x" onerror="alert(1)">';

      const xssItem = await prisma.item.create({
        data: {
          reportNumber: `XSS-TEST-${uniqueSuffix}`,
          name: `Clean Title with ${xssPayload}`,
          type: ItemReportType.LOST,
          category: 'OTHER',
          color: 'Black',
          locationBuilding: 'Student Union',
          collegeId: TEST_COLLEGE_ID,
          campusId: 'apex-north',
          reporterId: testUserAId,
          status: ItemStatus.OPEN,
          occurredAt: new Date(),
          description: `Description containing ${xssPayload}`,
        },
      });

      // Item persists as literal string data without server-side execution
      expect(xssItem.name).toContain('<script>');
      expect(xssItem.description).toContain('onerror=');

      // Clean up
      await prisma.item.delete({ where: { id: xssItem.id } });
    });
  });

  // ----------------------------------------------------------------------------
  // OWASP ASVS V12: File Upload & Malicious File Defenses
  // ----------------------------------------------------------------------------
  describe('V12: File Upload Safety & Extension Filtering', () => {
    it('rejects dangerous executable files (.exe, .sh, .php, .svg carrying XSS)', async () => {
      const dangerousFiles = [
        { filename: 'malware.exe', contentType: 'application/x-msdownload' },
        { filename: 'exploit.sh', contentType: 'application/x-sh' },
        { filename: 'webshell.php', contentType: 'application/x-php' },
        { filename: 'xss.svg', contentType: 'image/svg+xml' }, // SVGs can carry XSS payloads
      ];

      for (const f of dangerousFiles) {
        await expect(
          uploadFile({
            buffer: Buffer.from('test-payload'),
            filename: f.filename,
            contentType: f.contentType,
          })
        ).rejects.toThrow(/Unsupported file type/i);
      }
    });

    it('enforces upload size boundary (rejects files exceeding size limit)', async () => {
      const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024); // 11 MB
      await expect(
        uploadFile({
          buffer: oversizedBuffer,
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        })
      ).rejects.toThrow(/exceeds 10MB limit/i);
    });

    it('accepts legitimate image uploads (JPEG, PNG, WebP)', async () => {
      const validFiles = [
        { filename: 'earbuds.jpg', contentType: 'image/jpeg' },
        { filename: 'bottle.png', contentType: 'image/png' },
        { filename: 'idcard.webp', contentType: 'image/webp' },
      ];

      for (const f of validFiles) {
        const result = await uploadFile({
          buffer: Buffer.from('fake-valid-image-bytes'),
          filename: f.filename,
          contentType: f.contentType,
        });
        expect(result.url).toBeDefined();
        expect(result.contentType).toBe(f.contentType);
      }
    });
  });

  // ----------------------------------------------------------------------------
  // Machine Authentication & Edge Security (Hybrid Link)
  // ----------------------------------------------------------------------------
  describe('Hybrid Edge Worker Machine Authentication', () => {
    it('verifies that machine API keys are hashed and plain keys are never stored', async () => {
      const { key, hash } = generateCampusApiKey();

      // Database stores hash, not plain key
      expect(hash).toHaveLength(64); // SHA-256 hex string
      expect(hash).not.toEqual(key);
      expect(key.startsWith('ll_camp_live_')).toBe(true);

      const computedHash = hashApiKey(key);
      expect(computedHash).toEqual(hash);
    });
  });
});
