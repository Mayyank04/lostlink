import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { prisma } from '../lib/db';
import { POST as verifyCollegeHandler } from '../app/api/auth/verify-college/route';
import { POST as resendOtpHandler } from '../app/api/auth/resend-otp/route';
import { POST as registerHandler } from '../app/api/auth/register/route';
import { POST as forgotPasswordHandler } from '../app/api/auth/forgot-password/route';
import { POST as resetPasswordHandler } from '../app/api/auth/reset-password/route';
import { GET as searchCollegesHandler } from '../app/api/colleges/search/route';
import { POST as createCollegeHandler } from '../app/api/platform-admin/colleges/route';
import { PATCH as patchCollegeHandler } from '../app/api/platform-admin/colleges/[id]/route';
import { POST as approveCollegeHandler } from '../app/api/platform-admin/colleges/[id]/approve/route';
import { POST as rejectCollegeHandler } from '../app/api/platform-admin/colleges/[id]/reject/route';
import {
  GET as getDomainVerificationHandler,
  POST as postDomainVerificationHandler,
} from '../app/api/platform-admin/colleges/[id]/domain-verification/route';
import { PATCH as patchUserStatusHandler } from '../app/api/platform-admin/users/[id]/status/route';
import { PATCH as patchStudentMembershipHandler } from '../app/api/college-admin/students/[id]/route';
import {
  createEmailVerificationOTP,
  verifyEmailVerificationOTP,
} from '../lib/auth/emailVerification';
import {
  requirePlatformAdmin,
  requireCollegeAdmin,
  requireCollegeMembership,
  requireAuth,
  AuthError,
} from '../lib/auth/tenant';
import { createSession, getCurrentUser } from '../lib/auth/session';
import { hashPassword, verifyPassword } from '../lib/auth/password';
import { UserRole, UserStatus, CollegeStatus, MembershipStatus } from '@prisma/client';

describe('LostLink 2.0 Master Security & Functionality Repair Test Suite', () => {
  let collegeA: any;
  let collegeB: any;
  let pendingCollege: any;
  let platformAdminUser: any;
  let collegeAAdminUser: any;
  let collegeBAdminUser: any;
  let studentUserA: any;
  let studentUserB: any;
  let suspendedUser: any;
  let platformAdminSessionToken: string;

  beforeAll(async () => {
    // 1. Setup Test Colleges
    collegeA = await prisma.college.upsert({
      where: { slug: 'sec-test-college-a' },
      update: {
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
        emailDomains: ['college-a.edu'],
      },
      create: {
        name: 'Security Test College Alpha',
        shortName: 'STC-A',
        slug: 'sec-test-college-a',
        emailDomains: ['college-a.edu'],
        city: 'Metropolis',
        state: 'NY',
        country: 'United States',
        primaryColor: '#0F766E',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
      },
    });

    collegeB = await prisma.college.upsert({
      where: { slug: 'sec-test-college-b' },
      update: {
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
        emailDomains: ['college-b.edu'],
      },
      create: {
        name: 'Security Test College Beta',
        shortName: 'STC-B',
        slug: 'sec-test-college-b',
        emailDomains: ['college-b.edu'],
        city: 'Gotham',
        state: 'NJ',
        country: 'United States',
        primaryColor: '#4338CA',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
      },
    });

    pendingCollege = await prisma.college.upsert({
      where: { slug: 'sec-test-college-pending' },
      update: {
        status: CollegeStatus.PENDING,
        domainVerificationStatus: 'PENDING',
        emailDomains: ['pending-inst.edu'],
      },
      create: {
        name: 'Pending Institute of Technology',
        shortName: 'PIT',
        slug: 'sec-test-college-pending',
        emailDomains: ['pending-inst.edu'],
        city: 'Star City',
        state: 'CA',
        country: 'United States',
        status: CollegeStatus.PENDING,
        domainVerificationStatus: 'PENDING',
      },
    });

    // 2. Setup Test Users
    const dummyPasswordHash = await hashPassword('SecurePassword123!');

    platformAdminUser = await prisma.user.upsert({
      where: { email: 'sec-platform-admin@lostlink.org' },
      update: { role: UserRole.PLATFORM_ADMIN, status: UserStatus.ACTIVE },
      create: {
        email: 'sec-platform-admin@lostlink.org',
        name: 'Root Platform Admin',
        passwordHash: dummyPasswordHash,
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    collegeAAdminUser = await prisma.user.upsert({
      where: { email: 'admin@college-a.edu' },
      update: { role: UserRole.COLLEGE_ADMIN, status: UserStatus.ACTIVE },
      create: {
        email: 'admin@college-a.edu',
        name: 'College A Administrator',
        passwordHash: dummyPasswordHash,
        role: UserRole.COLLEGE_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: collegeAAdminUser.id,
          collegeId: collegeA.id,
        },
      },
      update: { status: MembershipStatus.VERIFIED },
      create: {
        userId: collegeAAdminUser.id,
        collegeId: collegeA.id,
        status: MembershipStatus.VERIFIED,
      },
    });

    collegeBAdminUser = await prisma.user.upsert({
      where: { email: 'admin@college-b.edu' },
      update: { role: UserRole.COLLEGE_ADMIN, status: UserStatus.ACTIVE },
      create: {
        email: 'admin@college-b.edu',
        name: 'College B Administrator',
        passwordHash: dummyPasswordHash,
        role: UserRole.COLLEGE_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: collegeBAdminUser.id,
          collegeId: collegeB.id,
        },
      },
      update: { status: MembershipStatus.VERIFIED },
      create: {
        userId: collegeBAdminUser.id,
        collegeId: collegeB.id,
        status: MembershipStatus.VERIFIED,
      },
    });

    studentUserA = await prisma.user.upsert({
      where: { email: 'student@college-a.edu' },
      update: { role: UserRole.STUDENT, status: UserStatus.ACTIVE },
      create: {
        email: 'student@college-a.edu',
        name: 'Student Alpha',
        passwordHash: dummyPasswordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: studentUserA.id,
          collegeId: collegeA.id,
        },
      },
      update: { status: MembershipStatus.VERIFIED },
      create: {
        userId: studentUserA.id,
        collegeId: collegeA.id,
        status: MembershipStatus.VERIFIED,
      },
    });

    studentUserB = await prisma.user.upsert({
      where: { email: 'student@college-b.edu' },
      update: { role: UserRole.STUDENT, status: UserStatus.ACTIVE },
      create: {
        email: 'student@college-b.edu',
        name: 'Student Beta',
        passwordHash: dummyPasswordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: studentUserB.id,
          collegeId: collegeB.id,
        },
      },
      update: { status: MembershipStatus.PENDING },
      create: {
        userId: studentUserB.id,
        collegeId: collegeB.id,
        status: MembershipStatus.PENDING,
      },
    });

    suspendedUser = await prisma.user.upsert({
      where: { email: 'suspended-user@college-a.edu' },
      update: { role: UserRole.STUDENT, status: UserStatus.SUSPENDED },
      create: {
        email: 'suspended-user@college-a.edu',
        name: 'Suspended Student',
        passwordHash: dummyPasswordHash,
        role: UserRole.STUDENT,
        status: UserStatus.SUSPENDED,
      },
    });

    // Create session token for platform admin API requests
    const adminSession = await createSession(platformAdminUser.id);
    platformAdminSessionToken = adminSession.token;
  });

  afterAll(async () => {
    // Clean up created sessions for tests
    await prisma.session.deleteMany({
      where: {
        userId: {
          in: [
            platformAdminUser.id,
            collegeAAdminUser.id,
            collegeBAdminUser.id,
            studentUserA.id,
            studentUserB.id,
            suspendedUser.id,
          ],
        },
      },
    });
  });

  // =========================================================================
  // 1. SECURE COLLEGE-BOUND OTP VERIFICATION
  // =========================================================================
  describe('1. Secure College-Bound OTP Verification', () => {
    it('creates an OTP strictly bound to (email, collegeId, userId)', async () => {
      const email = `bound.test.${Date.now()}.${Math.floor(Math.random() * 1000)}@college-a.edu`;
      const rawOtp = await createEmailVerificationOTP(email, collegeA.id, studentUserA.id);

      expect(rawOtp).toHaveLength(6);

      const tokenRecord = await prisma.verificationToken.findFirst({
        where: {
          identifier: email,
          collegeId: collegeA.id,
          userId: studentUserA.id,
        },
      });

      expect(tokenRecord).not.toBeNull();
      expect(tokenRecord?.attempts).toBe(0);
      expect(tokenRecord?.consumedAt).toBeNull();
      // Token must be stored as SHA-256 hash, not raw plaintext
      expect(tokenRecord?.token).not.toBe(rawOtp);
      const expectedHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
      expect(tokenRecord?.token).toBe(expectedHash);
    });

    it('rejects OTP verification when collegeId does not match the token college binding', async () => {
      const email = `cross.bound.${Date.now()}.${Math.floor(Math.random() * 1000)}@college-a.edu`;
      const rawOtp = await createEmailVerificationOTP(email, collegeA.id, studentUserA.id);

      // Attempt verification against College B
      const result = await verifyEmailVerificationOTP(email, rawOtp, collegeB.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid or has expired');
    });

    it('increments attempts on invalid OTP guess and locks after 5 failed attempts', async () => {
      const email = `lockout.test.${Date.now()}.${Math.floor(Math.random() * 1000)}@college-a.edu`;
      const correctOtp = await createEmailVerificationOTP(email, collegeA.id, studentUserA.id);

      // 5 failed attempts
      for (let i = 1; i <= 5; i++) {
        const attempt = await verifyEmailVerificationOTP(email, '000000', collegeA.id);
        expect(attempt.success).toBe(false);
        if (i < 5) {
          expect(attempt.error).toContain('Incorrect verification code');
        } else {
          expect(attempt.error).toContain('Maximum verification attempts exceeded');
        }
      }

      // 6th attempt with the correct OTP should now be rejected because challenge is locked
      const sixthAttempt = await verifyEmailVerificationOTP(email, correctOtp, collegeA.id);
      expect(sixthAttempt.success).toBe(false);
      expect(sixthAttempt.error).toContain('Maximum verification attempts exceeded');
    });

    it('marks OTP as consumed atomically and prevents replay attacks', async () => {
      const email = `replay.test.${Date.now()}.${Math.floor(Math.random() * 1000)}@college-a.edu`;
      const rawOtp = await createEmailVerificationOTP(email, collegeA.id, studentUserA.id);

      // First verification succeeds
      const firstResult = await verifyEmailVerificationOTP(email, rawOtp, collegeA.id);
      expect(firstResult.success).toBe(true);

      // Check consumedAt in DB
      const record = await prisma.verificationToken.findFirst({
        where: { identifier: email, collegeId: collegeA.id },
      });
      expect(record?.consumedAt).not.toBeNull();

      // Second verification must fail (replay rejection)
      const secondResult = await verifyEmailVerificationOTP(email, rawOtp, collegeA.id);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('already been used');
    });

    it('concurrent verification requests are handled atomically so exactly one succeeds and duplicates fail', async () => {
      const email = `concurrent.test.${Date.now()}.${Math.floor(Math.random() * 1000)}@college-a.edu`;
      const rawOtp = await createEmailVerificationOTP(email, collegeA.id, studentUserA.id);

      // Fire 3 simultaneous verification attempts with the same valid OTP
      const results = await Promise.all([
        verifyEmailVerificationOTP(email, rawOtp, collegeA.id),
        verifyEmailVerificationOTP(email, rawOtp, collegeA.id),
        verifyEmailVerificationOTP(email, rawOtp, collegeA.id),
      ]);

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(2);
    });

    it('rejects expired OTP challenge', async () => {
      const email = `expired.test.${Date.now()}.${Math.floor(Math.random() * 1000)}@college-a.edu`;
      const otp = '849302';
      const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token: hashedOtp,
          collegeId: collegeA.id,
          userId: studentUserA.id,
          expiresAt: new Date(Date.now() - 1000 * 60), // expired 1 min ago
          attempts: 0,
        },
      });

      const result = await verifyEmailVerificationOTP(email, otp, collegeA.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('verify-college API endpoint executes 12-step validation and activates membership', async () => {
      const studentEmail = `api.verify.${Date.now()}.${Math.floor(Math.random() * 1000)}@college-b.edu`;
      const student = await prisma.user.create({
        data: {
          name: 'API Verify Student',
          email: studentEmail,
          passwordHash: await hashPassword('Pass123!'),
          role: UserRole.STUDENT,
        },
      });

      const membership = await prisma.collegeMembership.create({
        data: {
          userId: student.id,
          collegeId: collegeB.id,
          status: MembershipStatus.PENDING,
        },
      });

      const rawOtp = await createEmailVerificationOTP(studentEmail, collegeB.id, student.id);

      const req = new Request('http://localhost:3000/api/auth/verify-college', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': `127.0.0.${Math.floor(Math.random() * 200)}`,
        },
        body: JSON.stringify({
          email: studentEmail,
          otpCode: rawOtp,
          collegeId: collegeB.id,
        }),
      });

      const res = await verifyCollegeHandler(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify DB membership is now VERIFIED
      const updatedMembership = await prisma.collegeMembership.findUnique({
        where: { id: membership.id },
      });
      expect(updatedMembership?.status).toBe(MembershipStatus.VERIFIED);
      expect(updatedMembership?.verifiedAt).not.toBeNull();

      // Verify audit log was recorded
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'MEMBERSHIP_VERIFIED',
          actorId: student.id,
        },
      });
      expect(auditLog).not.toBeNull();
    });

    it('verify-college API rejects verification if college domain is pending or rejected', async () => {
      // Setup an active college with domain verification pending
      const activePendingDomainCollege = await prisma.college.upsert({
        where: { slug: 'active-domain-pending-test' },
        update: {
          status: CollegeStatus.ACTIVE,
          domainVerificationStatus: 'PENDING',
          emailDomains: ['active-domain-pending.edu'],
        },
        create: {
          name: 'Active College Domain Pending Test',
          slug: 'active-domain-pending-test',
          emailDomains: ['active-domain-pending.edu'],
          city: 'Albany',
          state: 'NY',
          country: 'United States',
          status: CollegeStatus.ACTIVE,
          domainVerificationStatus: 'PENDING',
        },
      });

      const pendingEmail = `pending.student.${Date.now()}.${Math.floor(Math.random() * 1000)}@active-domain-pending.edu`;
      const pendingStudent = await prisma.user.create({
        data: {
          name: 'Pending College Student',
          email: pendingEmail,
          passwordHash: await hashPassword('Pass123!'),
          role: UserRole.STUDENT,
        },
      });

      await prisma.collegeMembership.create({
        data: {
          userId: pendingStudent.id,
          collegeId: activePendingDomainCollege.id,
          status: MembershipStatus.PENDING,
        },
      });

      const pendingOtp = await createEmailVerificationOTP(
        pendingEmail,
        activePendingDomainCollege.id,
        pendingStudent.id
      );

      const req = new Request('http://localhost:3000/api/auth/verify-college', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': `127.0.0.${Math.floor(Math.random() * 200)}`,
        },
        body: JSON.stringify({
          email: pendingEmail,
          otpCode: pendingOtp,
          collegeId: activePendingDomainCollege.id,
        }),
      });

      const res = await verifyCollegeHandler(req as any);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('pending official verification');
    });
  });

  // =========================================================================
  // 2. 60-SECOND OTP RESEND COOLDOWN & INVALIDATION
  // =========================================================================
  describe('2. 60-Second OTP Resend Cooldown & Invalidation', () => {
    it('enforces 60-second cooldown between OTP resend requests', async () => {
      const email = `cooldown.student.${Date.now()}.${Math.floor(Math.random() * 1000)}@college-a.edu`;
      const student = await prisma.user.create({
        data: {
          name: 'Cooldown Student',
          email,
          passwordHash: await hashPassword('Pass123!'),
          role: UserRole.STUDENT,
        },
      });

      await prisma.collegeMembership.create({
        data: {
          userId: student.id,
          collegeId: collegeA.id,
          status: MembershipStatus.PENDING,
        },
      });

      // First resend request succeeds
      const req1 = new Request('http://localhost:3000/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.101',
        },
        body: JSON.stringify({ email, collegeId: collegeA.id }),
      });

      const res1 = await resendOtpHandler(req1 as any);
      expect(res1.status).toBe(200);

      // Immediate second resend request receives 429 cooldown error
      const req2 = new Request('http://localhost:3000/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.101',
        },
        body: JSON.stringify({ email, collegeId: collegeA.id }),
      });

      const res2 = await resendOtpHandler(req2 as any);
      const data2 = await res2.json();

      expect(res2.status).toBe(429);
      expect(data2.error).toContain('Please wait');
    });
  });

  // =========================================================================
  // 3. COLLEGE DOMAIN VERIFICATION DEFAULTS & LIFECYCLE
  // =========================================================================
  describe('3. College Domain Verification Defaults & Lifecycle', () => {
    let createdCollegeId: string;

    it('newly created college defaults to PENDING status and PENDING domain verification', async () => {
      const uniqueSuffix = Date.now().toString(36);
      const req = new Request('http://localhost:3000/api/platform-admin/colleges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${platformAdminSessionToken}`,
        },
        body: JSON.stringify({
          name: `St. Jude Polytechnic ${uniqueSuffix}`,
          slug: `stjude-polytechnic-${uniqueSuffix}`,
          shortName: 'SJP',
          emailDomains: [`stjude-${uniqueSuffix}.edu`],
          city: 'Buffalo',
          state: 'NY',
          country: 'United States',
        }),
      });

      const res = await createCollegeHandler(req as any);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.college.status).toBe('PENDING');
      expect(data.college.domainVerificationStatus).toBe('PENDING');
      createdCollegeId = data.college.id;

      // Verify in DB
      const dbCol = await prisma.college.findUnique({ where: { id: createdCollegeId } });
      expect(dbCol?.status).toBe(CollegeStatus.PENDING);
      expect(dbCol?.domainVerificationStatus).toBe('PENDING');
    });

    it('admin approval transitions college to ACTIVE and domain to VERIFIED with audit event', async () => {
      const req = new Request(
        `http://localhost:3000/api/platform-admin/colleges/${createdCollegeId}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${platformAdminSessionToken}`,
          },
          body: JSON.stringify({ notes: 'Verified official university accreditation' }),
        }
      );

      const res = await approveCollegeHandler(req as any, {
        params: Promise.resolve({ id: createdCollegeId }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.college.status).toBe('ACTIVE');
      expect(data.college.domainVerificationStatus).toBe('VERIFIED');

      const audit = await prisma.auditLog.findFirst({
        where: {
          collegeId: createdCollegeId,
          action: 'APPROVE_COLLEGE',
        },
      });
      expect(audit).not.toBeNull();
    });

    it('editing email domains in PATCH invalidates verification status to UNDER_REVIEW', async () => {
      const req = new Request(
        `http://localhost:3000/api/platform-admin/colleges/${createdCollegeId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${platformAdminSessionToken}`,
          },
          body: JSON.stringify({
            emailDomains: ['stjude.edu', 'polytechnic.stjude.edu'],
          }),
        }
      );

      const res = await patchCollegeHandler(req as any, {
        params: Promise.resolve({ id: createdCollegeId }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.college.domainVerificationStatus).toBe('UNDER_REVIEW');

      // Verify DB
      const dbCol = await prisma.college.findUnique({ where: { id: createdCollegeId } });
      expect(dbCol?.domainVerificationStatus).toBe('UNDER_REVIEW');
    });

    it('dedicated domain-verification endpoint supports state transitions (REVOKE, APPROVE)', async () => {
      // 1. Approve domain verification
      const reqApprove = new Request(
        `http://localhost:3000/api/platform-admin/colleges/${createdCollegeId}/domain-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${platformAdminSessionToken}`,
          },
          body: JSON.stringify({
            action: 'APPROVE',
            reason: 'Re-verified registrar ownership of added subdomain',
          }),
        }
      );

      const resApprove = await postDomainVerificationHandler(reqApprove as any, {
        params: Promise.resolve({ id: createdCollegeId }),
      });
      const dataApprove = await resApprove.json();

      expect(resApprove.status).toBe(200);
      expect(dataApprove.college.domainVerificationStatus).toBe('VERIFIED');

      // 2. Revoke domain verification
      const reqRevoke = new Request(
        `http://localhost:3000/api/platform-admin/colleges/${createdCollegeId}/domain-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${platformAdminSessionToken}`,
          },
          body: JSON.stringify({
            action: 'REVOKE',
            reason: 'Institutional domain expiration notice',
          }),
        }
      );

      const resRevoke = await postDomainVerificationHandler(reqRevoke as any, {
        params: Promise.resolve({ id: createdCollegeId }),
      });
      const dataRevoke = await resRevoke.json();

      expect(resRevoke.status).toBe(200);
      expect(dataRevoke.college.domainVerificationStatus).toBe('PENDING');

      // 3. GET returns domain verification history
      const reqGet = new Request(
        `http://localhost:3000/api/platform-admin/colleges/${createdCollegeId}/domain-verification`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${platformAdminSessionToken}`,
          },
        }
      );

      const resGet = await getDomainVerificationHandler(reqGet as any, {
        params: Promise.resolve({ id: createdCollegeId }),
      });
      const dataGet = await resGet.json();

      expect(resGet.status).toBe(200);
      expect(dataGet.domainVerificationStatus).toBe('PENDING');
      expect(dataGet.verificationAuditLogs.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 4. PUBLIC DIRECTORY STATUS INTEGRITY
  // =========================================================================
  describe('4. Public Directory Status Integrity', () => {
    it('public search endpoint accurately reflects database verification status without leaking internal metadata', async () => {
      // Create an active college with domain under review
      const underReviewCollege = await prisma.college.upsert({
        where: { slug: 'active-under-review-search-test' },
        update: {
          status: CollegeStatus.ACTIVE,
          domainVerificationStatus: 'UNDER_REVIEW',
          emailDomains: ['under-review-test.edu'],
        },
        create: {
          name: 'Under Review State University',
          shortName: 'URSU',
          slug: 'active-under-review-search-test',
          emailDomains: ['under-review-test.edu'],
          city: 'Buffalo',
          state: 'NY',
          country: 'United States',
          status: CollegeStatus.ACTIVE,
          domainVerificationStatus: 'UNDER_REVIEW',
        },
      });

      const req = new Request(
        `http://localhost:3000/api/colleges/search?q=Under%20Review%20State`
      );

      const res = await searchCollegesHandler(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      const found = data.colleges.find((c: any) => c.id === underReviewCollege.id);
      expect(found).toBeDefined();
      expect(found.isVerified).toBe(false);
      expect(found.domainVerificationStatus).toBe('UNDER_REVIEW');
      // Must not leak internal notes or metadata
      expect(found.domainMetadata).toBeUndefined();
      expect(found.notes).toBeUndefined();
    });

    it('public search returns isVerified: true for active college with VERIFIED domain', async () => {
      const req = new Request(
        `http://localhost:3000/api/colleges/search?q=Security%20Test%20College%20Alpha`
      );

      const res = await searchCollegesHandler(req as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      const found = data.colleges.find((c: any) => c.id === collegeA.id);
      expect(found).toBeDefined();
      expect(found.isVerified).toBe(true);
      expect(found.domainVerificationStatus).toBe('VERIFIED');
    });
  });

  // =========================================================================
  // 5. PASSWORD RESET & SESSION INVALIDATION
  // =========================================================================
  describe('5. Password Reset & Session Invalidation', () => {
    it('stores password reset token as SHA-256 hash in database', async () => {
      const email = `reset.test.${Date.now()}.${Math.floor(Math.random() * 10000)}@college-a.edu`;
      const user = await prisma.user.create({
        data: {
          name: 'Reset Test User',
          email,
          passwordHash: await hashPassword('InitialPass123!'),
          role: UserRole.STUDENT,
        },
      });

      const req = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.120',
        },
        body: JSON.stringify({ email }),
      });

      const res = await forgotPasswordHandler(req);
      expect(res.status).toBe(200);

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { email },
      });

      expect(tokenRecord).not.toBeNull();
      // Token stored in DB is a 64-character SHA-256 hex string
      expect(tokenRecord?.token).toHaveLength(64);
    });

    it('resets password, destroys active sessions, and deletes the reset token', async () => {
      const email = `session.invalidation.${Date.now()}.${Math.floor(Math.random() * 10000)}@college-a.edu`;
      const initialPassword = 'InitialPassword123!';
      const newPassword = 'BrandNewPassword2026!';

      const user = await prisma.user.create({
        data: {
          name: 'Session Invalidate User',
          email,
          passwordHash: await hashPassword(initialPassword),
          role: UserRole.STUDENT,
        },
      });

      // Create an active session
      const session = await createSession(user.id);

      // Verify session exists in DB
      let activeSessions = await prisma.session.findMany({ where: { userId: user.id } });
      expect(activeSessions).toHaveLength(1);

      // Generate a raw token and hash it for DB storage
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          email,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Execute password reset using the raw token
      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: rawToken,
          password: newPassword,
        }),
      });

      const res = await resetPasswordHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toContain('Password has been reset successfully');

      // 1. Password must be verified against new hash
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      const matchesNew = await verifyPassword(updatedUser!.passwordHash!, newPassword);
      expect(matchesNew).toBe(true);

      // 2. Active sessions must be purged (session invalidation)
      activeSessions = await prisma.session.findMany({ where: { userId: user.id } });
      expect(activeSessions).toHaveLength(0);

      // 3. Reset token must be deleted (single use)
      const tokenInDb = await prisma.passwordResetToken.findUnique({
        where: { token: hashedToken },
      });
      expect(tokenInDb).toBeNull();
    });
  });

  // =========================================================================
  // 6. TENANT ISOLATION & AUTHORIZATION PRIVILEGES
  // =========================================================================
  describe('6. Tenant Isolation & Authorization Privileges', () => {
    it('college administrator for College A is blocked from modifying College B student memberships with 403', async () => {
      // Find a membership belonging to College B
      const studentBMembership = await prisma.collegeMembership.findFirst({
        where: { collegeId: collegeB.id, userId: studentUserB.id },
      });
      expect(studentBMembership).not.toBeNull();

      // Create session for College A Admin
      const collegeAAdminSession = await createSession(collegeAAdminUser.id);

      const req = new Request(
        `http://localhost:3000/api/college-admin/students/${studentBMembership!.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${collegeAAdminSession.token}`,
          },
          body: JSON.stringify({
            status: MembershipStatus.VERIFIED,
          }),
        }
      );

      const res = await patchStudentMembershipHandler(req as any, {
        params: Promise.resolve({ id: studentBMembership!.id }),
      });

      expect(res.status).toBe(403);
    });

    it('student is rejected with 403 when invoking requirePlatformAdmin or requireCollegeAdmin', async () => {
      const studentSessionUser = {
        id: studentUserA.id,
        name: studentUserA.name,
        email: studentUserA.email,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        emailVerified: null,
        image: null,
        memberships: [
          {
            id: 'm1',
            collegeId: collegeA.id,
            status: MembershipStatus.VERIFIED,
            verifiedAt: new Date(),
            studentIdentifier: 'STU-001',
            college: {
              id: collegeA.id,
              name: collegeA.name,
              slug: collegeA.slug,
              logoUrl: null,
              city: collegeA.city,
              state: collegeA.state,
            },
          },
        ],
      };

      // Platform Admin check throws 403
      expect(() => requirePlatformAdmin(studentSessionUser)).toThrow(AuthError);
      try {
        requirePlatformAdmin(studentSessionUser);
      } catch (e: any) {
        expect(e.statusCode).toBe(403);
      }

      // College Admin check throws 403
      expect(() => requireCollegeAdmin(studentSessionUser, collegeA.id)).toThrow(AuthError);
      try {
        requireCollegeAdmin(studentSessionUser, collegeA.id);
      } catch (e: any) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('suspended user is denied access with 403 across tenant authorization helpers', async () => {
      const suspendedSessionUser = {
        id: suspendedUser.id,
        name: suspendedUser.name,
        email: suspendedUser.email,
        role: UserRole.STUDENT,
        status: UserStatus.SUSPENDED,
        emailVerified: null,
        image: null,
        memberships: [
          {
            id: 'm2',
            collegeId: collegeA.id,
            status: MembershipStatus.VERIFIED,
            verifiedAt: new Date(),
            studentIdentifier: 'SUS-001',
            college: {
              id: collegeA.id,
              name: collegeA.name,
              slug: collegeA.slug,
              logoUrl: null,
              city: collegeA.city,
              state: collegeA.state,
            },
          },
        ],
      };

      expect(() => requireCollegeMembership(suspendedSessionUser, collegeA.id)).toThrow(AuthError);
      try {
        requireCollegeMembership(suspendedSessionUser, collegeA.id);
      } catch (e: any) {
        expect(e.statusCode).toBe(403);
        expect(e.message).toContain('Account is suspended');
      }

      expect(() => requireCollegeAdmin(suspendedSessionUser, collegeA.id)).toThrow(AuthError);
      try {
        requireCollegeAdmin(suspendedSessionUser, collegeA.id);
      } catch (e: any) {
        expect(e.statusCode).toBe(403);
      }

      expect(() => requirePlatformAdmin(suspendedSessionUser)).toThrow(AuthError);
      try {
        requirePlatformAdmin(suspendedSessionUser);
      } catch (e: any) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('modifying user role or suspending user immediately purges active sessions', async () => {
      const email = `role.change.${Date.now()}.${Math.floor(Math.random() * 1000)}@college-a.edu`;
      const testUser = await prisma.user.create({
        data: {
          name: 'Role Change Test',
          email,
          passwordHash: await hashPassword('Pass123!'),
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      // Create session
      await createSession(testUser.id);
      let activeSessions = await prisma.session.findMany({ where: { userId: testUser.id } });
      expect(activeSessions.length).toBe(1);

      // Platform admin changes user's role to COLLEGE_ADMIN
      const req = new Request(`http://localhost:3000/api/platform-admin/users/${testUser.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${platformAdminSessionToken}`,
        },
        body: JSON.stringify({ role: UserRole.COLLEGE_ADMIN }),
      });

      const res = await patchUserStatusHandler(req as any, { params: Promise.resolve({ id: testUser.id }) });
      expect(res.status).toBe(200);

      // Verify sessions purged
      activeSessions = await prisma.session.findMany({ where: { userId: testUser.id } });
      expect(activeSessions.length).toBe(0);
    });
  });
});
