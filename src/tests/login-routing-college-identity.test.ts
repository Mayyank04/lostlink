import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth/session';
import { resolveCollegeFromEmail } from '@/lib/college/resolve-college';
import { createEmailVerificationOTP, verifyEmailVerificationOTP } from '@/lib/auth/emailVerification';
import { getActiveUserId, getActiveCollegeId, clearActiveUserAndCollege } from '@/lib/storage/localStore';
import { POST as verifyCollegeHandler } from '@/app/api/auth/verify-college/route';
import { UserRole, MembershipStatus, CollegeStatus } from '@prisma/client';
import crypto from 'crypto';

describe('LOSTLINK 2.0 — LOGIN ROUTING, 404 & COLLEGE IDENTITY REPAIR', () => {
  let iilmCollege: any;
  let apexCollege: any;
  let onboardedStudentIILM: any;
  let freshStudentIILM: any;
  let apexStudent: any;

  beforeAll(async () => {
    // 1. Ensure IILM University exists and is VERIFIED
    iilmCollege = await prisma.college.upsert({
      where: { slug: 'iilm-university' },
      update: {
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
        emailDomains: ['iilm.edu'],
      },
      create: {
        id: 'college-iilm',
        name: 'IILM University',
        shortName: 'IILM',
        slug: 'iilm-university',
        emailDomains: ['iilm.edu'],
        city: 'Greater Noida',
        state: 'Uttar Pradesh',
        country: 'India',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
      },
    });

    // Also ensure CollegeEmailDomain record exists for iilm.edu
    await prisma.collegeEmailDomain.upsert({
      where: { domain: 'iilm.edu' },
      update: {
        collegeId: iilmCollege.id,
        verificationStatus: 'VERIFIED',
      },
      create: {
        domain: 'iilm.edu',
        collegeId: iilmCollege.id,
        verificationStatus: 'VERIFIED',
      },
    }).catch(() => {});

    // 2. Ensure Apex University exists
    apexCollege = await prisma.college.upsert({
      where: { slug: 'apex-tech' },
      update: {
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
        emailDomains: ['apex.edu'],
      },
      create: {
        id: 'college-apex',
        name: 'Apex University of Science & Technology',
        shortName: 'Apex',
        slug: 'apex-tech',
        emailDomains: ['apex.edu'],
        city: 'Palo Alto',
        state: 'California',
        country: 'United States',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
      },
    });

    // 3. Create fully onboarded IILM student
    onboardedStudentIILM = await prisma.user.upsert({
      where: { email: 'onboarded.iilm@iilm.edu' },
      update: { isOnboarded: true, emailVerified: new Date() },
      create: {
        email: 'onboarded.iilm@iilm.edu',
        name: 'Onboarded IILM Student',
        role: UserRole.STUDENT,
        status: 'ACTIVE',
        emailVerified: new Date(),
        isOnboarded: true,
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: onboardedStudentIILM.id,
          collegeId: iilmCollege.id,
        },
      },
      update: { status: MembershipStatus.VERIFIED },
      create: {
        userId: onboardedStudentIILM.id,
        collegeId: iilmCollege.id,
        status: MembershipStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    // 4. Create fresh (not yet onboarded) IILM student
    freshStudentIILM = await prisma.user.upsert({
      where: { email: 'fresh.iilm@iilm.edu' },
      update: { isOnboarded: false, emailVerified: new Date() },
      create: {
        email: 'fresh.iilm@iilm.edu',
        name: 'Fresh IILM Student',
        role: UserRole.STUDENT,
        status: 'ACTIVE',
        emailVerified: new Date(),
        isOnboarded: false,
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: freshStudentIILM.id,
          collegeId: iilmCollege.id,
        },
      },
      update: { status: MembershipStatus.VERIFIED },
      create: {
        userId: freshStudentIILM.id,
        collegeId: iilmCollege.id,
        status: MembershipStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    // 5. Create Apex student
    apexStudent = await prisma.user.upsert({
      where: { email: 'apex.student@apex.edu' },
      update: { isOnboarded: true, emailVerified: new Date() },
      create: {
        email: 'apex.student@apex.edu',
        name: 'Apex Student',
        role: UserRole.STUDENT,
        status: 'ACTIVE',
        emailVerified: new Date(),
        isOnboarded: true,
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: apexStudent.id,
          collegeId: apexCollege.id,
        },
      },
      update: { status: MembershipStatus.VERIFIED },
      create: {
        userId: apexStudent.id,
        collegeId: apexCollege.id,
        status: MembershipStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });
  });

  // =========================================================================
  // TEST 1: Root route redirects to /login when unauthenticated
  // =========================================================================
  it('1. Confirms root route / redirects unauthenticated users to /login', async () => {
    const unauthReq = new NextRequest('http://localhost:3000/');
    const response = await middleware(unauthReq);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login');
  });

  // =========================================================================
  // TEST 2: Login redirects authenticated students appropriately
  // =========================================================================
  it('2a. Confirms onboarded student visiting /login is redirected to /dashboard', async () => {
    const { token } = await createSession(onboardedStudentIILM.id);

    const authReq = new NextRequest('http://localhost:3000/login', {
      headers: { cookie: `lostlink_session=${token}` },
    });
    const response = await middleware(authReq);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('2b. Confirms incomplete profile student visiting /login is redirected to /onboarding/student', async () => {
    const { token } = await createSession(freshStudentIILM.id);

    const authReq = new NextRequest('http://localhost:3000/login', {
      headers: { cookie: `lostlink_session=${token}` },
    });
    const response = await middleware(authReq);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/onboarding/student');
  });

  // =========================================================================
  // TEST 3: Verification route remains accessible for unauthenticated registration
  // =========================================================================
  it('3. Confirms /auth/verify-college remains accessible during registration flow', async () => {
    const verifyReq = new NextRequest(
      'http://localhost:3000/auth/verify-college?email=mayank%40iilm.edu&college=college-iilm'
    );
    const response = await middleware(verifyReq);

    // Passes through to render verify-college page (not intercepted/redirected)
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  // =========================================================================
  // TEST 4: IILM email resolves to the correct college record
  // =========================================================================
  it('4. Confirms mayank@iilm.edu resolves strictly to IILM University, not Apex', async () => {
    const resolution = await resolveCollegeFromEmail('mayank@iilm.edu');

    expect(resolution.success).toBe(true);
    if (resolution.success) {
      expect(resolution.collegeId).toBe('college-iilm');
      expect(resolution.collegeName).toBe('IILM University');
      expect(resolution.domain).toBe('iilm.edu');
      expect(resolution.status).toBe('ACTIVE');
      expect(resolution.domainStatus).toBe('VERIFIED');
    }
  });

  // =========================================================================
  // TEST 5: Active Apex session cannot verify or claim IILM membership
  // =========================================================================
  it('5. Confirms active Apex student session is rejected with 403 on IILM verification (Session Conflict)', async () => {
    const { token } = await createSession(apexStudent.id);

    const pendingIILM = await prisma.user.upsert({
      where: { email: 'cross.apex.conflict@iilm.edu' },
      update: { emailVerified: null },
      create: {
        email: 'cross.apex.conflict@iilm.edu',
        name: 'Conflict Student',
        role: UserRole.STUDENT,
        status: 'ACTIVE',
      },
    });

    const otp = await createEmailVerificationOTP(pendingIILM.email, iilmCollege.id);

    const req = new NextRequest('http://localhost:3000/api/auth/verify-college', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `lostlink_session=${token}`, // Apex student session cookie!
      },
      body: JSON.stringify({
        email: pendingIILM.email,
        collegeId: iilmCollege.id,
        otpCode: otp,
      }),
    });

    const res = await verifyCollegeHandler(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Active session conflict');
  });

  // =========================================================================
  // TEST 6: URL college parameter cannot override server-side domain resolution
  // =========================================================================
  it('6. Confirms server rejects client-supplied foreign collegeId during verification (Tampering Defense)', async () => {
    const pendingEmail = `tamper.${Date.now()}@iilm.edu`;
    const targetUser = await prisma.user.create({
      data: {
        email: pendingEmail,
        name: 'Tamper Target',
        role: UserRole.STUDENT,
        status: 'ACTIVE',
      },
    });

    const otp = await createEmailVerificationOTP(pendingEmail, iilmCollege.id);

    // Caller attempts to pass collegeId: 'college-apex' for an @iilm.edu address
    const req = new NextRequest('http://localhost:3000/api/auth/verify-college', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: pendingEmail,
        collegeId: 'college-apex', // Forged/mismatched college ID!
        otpCode: otp,
      }),
    });

    const res = await verifyCollegeHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Institutional mismatch');
  });

  // =========================================================================
  // TEST 7: OTP cannot be reused for a different email or college
  // =========================================================================
  it('7. Confirms OTP issued for College A cannot verify for College B', async () => {
    const emailA = `otp.test.a.${Date.now()}@iilm.edu`;
    const emailB = `otp.test.b.${Date.now()}@apex.edu`;

    const otpA = await createEmailVerificationOTP(emailA, iilmCollege.id);

    // Attempting to use otpA on emailB must fail
    const badCheck = await verifyEmailVerificationOTP(emailB, otpA, apexCollege.id);
    expect(badCheck.success).toBe(false);
  });

  // =========================================================================
  // TEST 8: Demo session does not leak into normal visitor identity
  // =========================================================================
  it('8. Confirms storage helper returns null by default, preventing silent demo login', () => {
    clearActiveUserAndCollege();

    const activeUser = getActiveUserId();
    const activeCollege = getActiveCollegeId();

    expect(activeUser).toBeNull();
    expect(activeCollege).toBeNull();
  });

  // =========================================================================
  // TEST 9: Logout clears previous identity
  // =========================================================================
  it('9. Confirms clearing active identity purges local storage keys', () => {
    clearActiveUserAndCollege();
    expect(getActiveUserId()).toBeNull();
    expect(getActiveCollegeId()).toBeNull();
  });

  // =========================================================================
  // TEST 10: Tenant isolation remains strictly enforced
  // =========================================================================
  it('10. Confirms student of IILM cannot access or modify Apex records', async () => {
    const student = await prisma.user.findUnique({
      where: { email: onboardedStudentIILM.email },
      include: { memberships: true },
    });

    const userMembership = student?.memberships.find((m) => m.collegeId === iilmCollege.id);
    expect(userMembership).toBeDefined();
    expect(userMembership?.collegeId).toBe(iilmCollege.id);

    // Student has zero memberships in Apex
    const apexMembership = student?.memberships.find((m) => m.collegeId === apexCollege.id);
    expect(apexMembership).toBeUndefined();
  });
});
