import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { isSandboxModeEnabled, isSandboxOtpValid, SANDBOX_OTP } from '@/lib/auth/sandbox';
import { createEmailVerificationOTP, verifyEmailVerificationOTP } from '@/lib/auth/emailVerification';
import { createSession } from '@/lib/auth/session';
import { POST as sendOtpRoute } from '@/app/api/auth/send-otp/route';
import { POST as loginOtpRoute } from '@/app/api/auth/login-otp/route';
import { POST as postItemRoute } from '@/app/api/items/route';
import { middleware } from '@/middleware';
import { UserRole, MembershipStatus, CollegeStatus, DomainStatus } from '@prisma/client';

describe('LOSTLINK 2.0 — SANDBOX OTP LOGIN & LOGIN-FIRST FLOW', () => {
  let testCollege: any;
  let otherCollege: any;
  let onboardedStudent: any;
  let nonOnboardedStudent: any;
  let adminUser: any;
  let originalEnv: string | undefined;
  let originalSandboxFlag: string | undefined;

  beforeAll(async () => {
    originalEnv = process.env.NODE_ENV;
    originalSandboxFlag = process.env.AUTH_SANDBOX_MODE;

    // 1. Ensure test colleges exist
    testCollege = await prisma.college.upsert({
      where: { slug: 'ncu-sandbox-univ' },
      update: { status: CollegeStatus.ACTIVE, domainVerificationStatus: 'VERIFIED' },
      create: {
        id: 'college-ncu-sandbox',
        name: 'The NorthCap University',
        slug: 'ncu-sandbox-univ',
        emailDomains: ['ncuindia.edu'],
        city: 'Gurugram',
        state: 'Haryana',
        country: 'India',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
      },
    });

    await prisma.collegeEmailDomain.upsert({
      where: { domain: 'ncuindia.edu' },
      update: { verificationStatus: DomainStatus.VERIFIED },
      create: {
        collegeId: testCollege.id,
        domain: 'ncuindia.edu',
        verificationStatus: DomainStatus.VERIFIED,
        isPrimary: true,
      },
    });

    otherCollege = await prisma.college.upsert({
      where: { slug: 'other-sandbox-univ' },
      update: { status: CollegeStatus.ACTIVE, domainVerificationStatus: 'VERIFIED' },
      create: {
        id: 'college-other-sandbox',
        name: 'Other University',
        slug: 'other-sandbox-univ',
        emailDomains: ['other.edu.in'],
        city: 'Gurugram',
        state: 'Haryana',
        country: 'India',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
      },
    });

    await prisma.collegeEmailDomain.upsert({
      where: { domain: 'other.edu.in' },
      update: { verificationStatus: DomainStatus.VERIFIED },
      create: {
        collegeId: otherCollege.id,
        domain: 'other.edu.in',
        verificationStatus: DomainStatus.VERIFIED,
        isPrimary: true,
      },
    });

    // 2. Create onboarded student
    onboardedStudent = await prisma.user.upsert({
      where: { email: 'onboarded.sandbox@ncuindia.edu' },
      update: { isOnboarded: true, emailVerified: new Date() },
      create: {
        email: 'onboarded.sandbox@ncuindia.edu',
        name: 'Onboarded Student',
        role: UserRole.STUDENT,
        status: 'ACTIVE',
        emailVerified: new Date(),
        isOnboarded: true,
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: onboardedStudent.id,
          collegeId: testCollege.id,
        },
      },
      update: { status: MembershipStatus.VERIFIED },
      create: {
        userId: onboardedStudent.id,
        collegeId: testCollege.id,
        status: MembershipStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: onboardedStudent.id },
      update: { isOnboardingDone: true },
      create: {
        userId: onboardedStudent.id,
        studentIdNumber: 'NCU-2023-CS-001',
        course: 'B.Tech CSE',
        department: 'Computer Science',
        batch: '2023-2027',
        admissionYear: 2023,
        currentYear: 2,
        isOnboardingDone: true,
      },
    });

    // 3. Create non-onboarded student
    nonOnboardedStudent = await prisma.user.upsert({
      where: { email: 'fresh.sandbox@ncuindia.edu' },
      update: { isOnboarded: false, emailVerified: new Date() },
      create: {
        email: 'fresh.sandbox@ncuindia.edu',
        name: 'Fresh Student',
        role: UserRole.STUDENT,
        status: 'ACTIVE',
        emailVerified: new Date(),
        isOnboarded: false,
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: nonOnboardedStudent.id,
          collegeId: testCollege.id,
        },
      },
      update: { status: MembershipStatus.VERIFIED },
      create: {
        userId: nonOnboardedStudent.id,
        collegeId: testCollege.id,
        status: MembershipStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    await prisma.studentProfile.deleteMany({
      where: { userId: nonOnboardedStudent.id },
    }).catch(() => {});

    // 4. Create admin user
    adminUser = await prisma.user.upsert({
      where: { email: 'admin.protected@ncuindia.edu' },
      update: {},
      create: {
        email: 'admin.protected@ncuindia.edu',
        name: 'Protected College Admin',
        role: UserRole.COLLEGE_ADMIN,
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: adminUser.id,
          collegeId: testCollege.id,
        },
      },
      update: { status: MembershipStatus.VERIFIED },
      create: {
        userId: adminUser.id,
        collegeId: testCollege.id,
        status: MembershipStatus.VERIFIED,
      },
    });
  });

  afterAll(() => {
    (process.env as any).NODE_ENV = originalEnv;
    process.env.AUTH_SANDBOX_MODE = originalSandboxFlag;
  });

  // =========================================================================
  // REQUIREMENT 1: / opens login page for unauthenticated users
  // =========================================================================
  it('1. Confirms / redirects unauthenticated users to /login via middleware', async () => {
    const unauthReq = new NextRequest('http://localhost:3000/');
    const response = await middleware(unauthReq);

    // Unauthenticated request to / redirects to /login
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login');
  });

  // =========================================================================
  // REQUIREMENT 2: Sandbox OTP 123456 succeeds in permitted sandbox mode
  // =========================================================================
  it('2. Confirms sandbox OTP 123456 succeeds in permitted development sandbox mode', async () => {
    (process.env as any).NODE_ENV = 'development';
    process.env.AUTH_SANDBOX_MODE = 'true';

    expect(isSandboxModeEnabled()).toBe(true);
    expect(isSandboxOtpValid(SANDBOX_OTP)).toBe(true);

    const res = await loginOtpRoute(
      new Request('http://localhost:3000/api/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'onboarded.sandbox@ncuindia.edu',
          otp: '123456',
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('onboarded.sandbox@ncuindia.edu');
    expect(data.redirectTo).toBe('/dashboard');
  });

  // =========================================================================
  // REQUIREMENT 3: Incorrect sandbox OTP is rejected
  // =========================================================================
  it('3. Confirms an incorrect sandbox OTP is rejected (400 Bad Request)', async () => {
    (process.env as any).NODE_ENV = 'development';
    process.env.AUTH_SANDBOX_MODE = 'true';

    const res = await loginOtpRoute(
      new Request('http://localhost:3000/api/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'onboarded.sandbox@ncuindia.edu',
          otp: '999999', // Incorrect OTP
        }),
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  // =========================================================================
  // REQUIREMENT 4: Sandbox OTP is rejected in production
  // =========================================================================
  it('4. Confirms sandbox OTP is strictly rejected in production environments', async () => {
    // Force production environment
    (process.env as any).NODE_ENV = 'production';
    process.env.AUTH_SANDBOX_MODE = 'true'; // Even if flag is accidentally true!

    expect(isSandboxModeEnabled()).toBe(false);
    expect(isSandboxOtpValid(SANDBOX_OTP)).toBe(false);

    // Attempting sandbox OTP in production fails
    const prodRes = await verifyEmailVerificationOTP('onboarded.sandbox@ncuindia.edu', '123456', testCollege.id);
    expect(prodRes.success).toBe(false);

    // Restore development
    (process.env as any).NODE_ENV = 'development';
    process.env.AUTH_SANDBOX_MODE = 'true';
  });

  // =========================================================================
  // REQUIREMENT 5: Real OTP verification works when sandbox mode is disabled
  // =========================================================================
  it('5. Confirms real OTP flow operates when sandbox mode is disabled', async () => {
    (process.env as any).NODE_ENV = 'development';
    process.env.AUTH_SANDBOX_MODE = 'false';

    expect(isSandboxModeEnabled()).toBe(false);

    const testEmail = `real.flow.${Date.now()}@ncuindia.edu`;
    const realOtp = await createEmailVerificationOTP(testEmail, testCollege.id);
    expect(realOtp).toHaveLength(6);
    expect(realOtp).not.toBe('123456');

    // 123456 must be rejected when sandbox is disabled
    const badCheck = await verifyEmailVerificationOTP(testEmail, '123456', testCollege.id);
    expect(badCheck.success).toBe(false);

    // The real issued OTP must succeed
    const validCheck = await verifyEmailVerificationOTP(testEmail, realOtp, testCollege.id);
    expect(validCheck.success).toBe(true);

    // Re-enable sandbox mode for remaining tests
    process.env.AUTH_SANDBOX_MODE = 'true';
  });

  // =========================================================================
  // REQUIREMENT 6: Successful login creates a valid session cookie
  // =========================================================================
  it('6. Confirms successful login creates a valid session and sets cookie', async () => {
    const res = await loginOtpRoute(
      new Request('http://localhost:3000/api/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'onboarded.sandbox@ncuindia.edu',
          otp: '123456',
        }),
      })
    );

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('lostlink_session=');
  });

  // =========================================================================
  // REQUIREMENT 7: Onboarded students are redirected to /dashboard
  // =========================================================================
  it('7. Confirms onboarded students are redirected to /dashboard', async () => {
    const res = await loginOtpRoute(
      new Request('http://localhost:3000/api/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'onboarded.sandbox@ncuindia.edu',
          otp: '123456',
        }),
      })
    );

    const data = await res.json();
    expect(data.redirectTo).toBe('/dashboard');
    expect(data.user.isOnboarded).toBe(true);
  });

  // =========================================================================
  // REQUIREMENT 8: Students with incomplete profiles redirected to onboarding
  // =========================================================================
  it('8. Confirms students with incomplete profiles are redirected to /onboarding/student', async () => {
    const res = await loginOtpRoute(
      new Request('http://localhost:3000/api/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'fresh.sandbox@ncuindia.edu',
          otp: '123456',
        }),
      })
    );

    const data = await res.json();
    expect(data.redirectTo).toBe('/onboarding/student');
    expect(data.user.isOnboarded).toBe(false);
  });

  // =========================================================================
  // REQUIREMENT 9: Unauthenticated dashboard requests redirect to login
  // =========================================================================
  it('9. Confirms unauthenticated requests to /dashboard redirect to /login', async () => {
    const unauthReq = new NextRequest('http://localhost:3000/dashboard');
    const response = await middleware(unauthReq);

    expect(response.status).toBe(307);
    const redirectUrl = response.headers.get('location');
    expect(redirectUrl).toContain('/login');
  });

  // =========================================================================
  // REQUIREMENT 10: Students cannot access another college's records
  // =========================================================================
  it('10. Confirms students cannot report or access another college (403 Forbidden)', async () => {
    const studentSession = await createSession(onboardedStudent.id);

    const res = await postItemRoute(
      new Request('http://localhost:3000/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `lostlink_session=${studentSession.token}`,
          Authorization: `Bearer ${studentSession.token}`,
        },
        body: JSON.stringify({
          type: 'LOST',
          title: 'Cross College Intrusion Item',
          category: 'electronics',
          color: 'Black',
          description: 'Testing tenant isolation boundary',
          dateIncident: new Date().toISOString(),
          collegeId: otherCollege.id, // Foreign college
          locationDescription: 'Main Library 202',
        }),
      })
    );

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Active college verification required');
  });

  // =========================================================================
  // REQUIREMENT 11: Students cannot change their college through request parameters
  // =========================================================================
  it('11. Confirms server rejects client-supplied foreign collegeId during login', async () => {
    const res = await loginOtpRoute(
      new Request('http://localhost:3000/api/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'onboarded.sandbox@ncuindia.edu',
          otp: '123456',
          collegeId: otherCollege.id, // Client spoofing foreign college
        }),
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('cannot manually select or assign a different college');
  });

  // =========================================================================
  // REQUIREMENT 12: Sandbox login cannot grant administrator privileges
  // =========================================================================
  it('12. Confirms sandbox OTP login cannot grant administrator privileges (403 Forbidden)', async () => {
    const adminAttempt = await loginOtpRoute(
      new Request('http://localhost:3000/api/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin.protected@ncuindia.edu',
          otp: '123456',
        }),
      })
    );

    expect(adminAttempt.status).toBe(403);
    const data = await adminAttempt.json();
    expect(data.error).toContain('Sandbox OTP verification cannot be used for administrative accounts');
  });
});
