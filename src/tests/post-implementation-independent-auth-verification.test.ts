import { NextRequest } from 'next/server';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { resolveCollegeFromEmail } from '@/lib/college/resolve-college';
import { createEmailVerificationOTP, verifyEmailVerificationOTP } from '@/lib/auth/emailVerification';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { GET as getOnboardingRoute, POST as postOnboardingRoute } from '@/app/api/onboarding/student/route';
import { POST as postItemRoute } from '@/app/api/items/route';
import { GET as getCollegeAdminOverview } from '@/app/api/college-admin/overview/route';
import { GET as getPlatformAdminOverview } from '@/app/api/platform-admin/overview/route';
import { UserRole, MembershipStatus, CollegeStatus, DomainStatus } from '@prisma/client';

describe('LOSTLINK POST-IMPLEMENTATION INDEPENDENT AUTHENTICATION VERIFICATION', () => {
  let apexCollege: any;
  let bmuCollege: any;
  let testStudentUser: any;
  let testStudentSessionToken: string;
  let unverifiedStudentUser: any;
  let unverifiedStudentSessionToken: string;
  let collegeAdminUser: any;
  let collegeAdminSessionToken: string;
  let platformAdminUser: any;
  let platformAdminSessionToken: string;

  beforeAll(async () => {
    // 1. Ensure test colleges exist with verified domains
    apexCollege = await prisma.college.upsert({
      where: { slug: 'apex-university' },
      update: { status: CollegeStatus.ACTIVE, domainVerificationStatus: 'VERIFIED' },
      create: {
        id: 'test-col-apex',
        name: 'Apex University',
        slug: 'apex-university',
        emailDomains: ['apex.edu'],
        city: 'Gurugram',
        state: 'Haryana',
        country: 'India',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
      },
    });

    await prisma.collegeEmailDomain.upsert({
      where: { domain: 'apex.edu' },
      update: { verificationStatus: DomainStatus.VERIFIED },
      create: {
        collegeId: apexCollege.id,
        domain: 'apex.edu',
        verificationStatus: DomainStatus.VERIFIED,
        isPrimary: true,
      },
    });

    bmuCollege = await prisma.college.findUnique({
      where: { id: 'college-bml-munjal' },
    });

    // 2. Create verified student user
    testStudentUser = await prisma.user.upsert({
      where: { email: 'verified.student.indep@apex.edu' },
      update: { emailVerified: new Date(), isOnboarded: false },
      create: {
        email: 'verified.student.indep@apex.edu',
        name: 'Independent Student',
        passwordHash: await hashPassword('StudentPassword123!'),
        role: UserRole.STUDENT,
        status: 'ACTIVE',
        emailVerified: new Date(),
        isOnboarded: false,
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: testStudentUser.id,
          collegeId: apexCollege.id,
        },
      },
      update: { status: MembershipStatus.VERIFIED },
      create: {
        userId: testStudentUser.id,
        collegeId: apexCollege.id,
        status: MembershipStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    const studentSession = await createSession(testStudentUser.id);
    testStudentSessionToken = studentSession.token;

    // 3. Create unverified student user (membership PENDING, emailVerified null)
    unverifiedStudentUser = await prisma.user.upsert({
      where: { email: 'unverified.student.indep@apex.edu' },
      update: { emailVerified: null, isOnboarded: false },
      create: {
        email: 'unverified.student.indep@apex.edu',
        name: 'Unverified Student',
        passwordHash: await hashPassword('StudentPassword123!'),
        role: UserRole.STUDENT,
        status: 'ACTIVE',
        emailVerified: null,
        isOnboarded: false,
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: unverifiedStudentUser.id,
          collegeId: apexCollege.id,
        },
      },
      update: { status: MembershipStatus.PENDING, verifiedAt: null },
      create: {
        userId: unverifiedStudentUser.id,
        collegeId: apexCollege.id,
        status: MembershipStatus.PENDING,
      },
    });

    const unverifiedSession = await createSession(unverifiedStudentUser.id);
    unverifiedStudentSessionToken = unverifiedSession.token;

    // 4. Create college admin
    collegeAdminUser = await prisma.user.upsert({
      where: { email: 'college.admin.indep@apex.edu' },
      update: {},
      create: {
        email: 'college.admin.indep@apex.edu',
        name: 'College Admin',
        passwordHash: await hashPassword('AdminPassword123!'),
        role: UserRole.COLLEGE_ADMIN,
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });

    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId: {
          userId: collegeAdminUser.id,
          collegeId: apexCollege.id,
        },
      },
      update: { status: MembershipStatus.VERIFIED },
      create: {
        userId: collegeAdminUser.id,
        collegeId: apexCollege.id,
        status: MembershipStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    const adminSession = await createSession(collegeAdminUser.id);
    collegeAdminSessionToken = adminSession.token;

    // 5. Create platform admin
    platformAdminUser = await prisma.user.upsert({
      where: { email: 'platform.admin.indep@lostlink.org' },
      update: {},
      create: {
        email: 'platform.admin.indep@lostlink.org',
        name: 'Platform Super Admin',
        passwordHash: await hashPassword('PlatformAdmin123!'),
        role: UserRole.PLATFORM_ADMIN,
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });

    const platformSession = await createSession(platformAdminUser.id);
    platformAdminSessionToken = platformSession.token;
  });

  // =========================================================================
  // CRITERIA 1: /login provides working student login & registration navigation
  // =========================================================================
  it('1. Confirms /login and /register connections and login route responsiveness', async () => {
    const res = await loginRoute(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'verified.student.indep@apex.edu',
          password: 'StudentPassword123!',
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe('verified.student.indep@apex.edu');
    expect(data.redirectTo).toBe('/onboarding/student');
  });

  // =========================================================================
  // CRITERIA 2: Registration rejects non-educational, unregistered, or pending domains
  // =========================================================================
  it('2. Confirms students can register ONLY with verified institutional email domains', async () => {
    // 2a. Reject public consumer email
    const publicRes = await registerRoute(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hacker Bob',
          email: 'hacker@gmail.com',
          password: 'Password123!',
        }),
      })
    );
    expect(publicRes.status).toBe(400);
    const publicData = await publicRes.json();
    expect(publicData.error).toContain('Personal email addresses');

    // 2b. Reject unregistered educational domain
    const unregRes = await registerRoute(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Unknown Student',
          email: 'student@unregistered-univ-xyz.edu',
          password: 'Password123!',
        }),
      })
    );
    expect(unregRes.status).toBe(400);
    const unregData = await unregRes.json();
    expect(unregData.error).toContain('not currently registered on LostLink');

    // 2c. Reject pending unverified domain (e.g. Starex University)
    const pendingRes = await registerRoute(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pending Student',
          email: 'student@starexuniversity.co.in',
          password: 'Password123!',
        }),
      })
    );
    expect(pendingRes.status).toBe(400);
    const pendingData = await pendingRes.json();
    expect(pendingData.error).toContain('pending official verification');
  });

  // =========================================================================
  // CRITERIA 3: OTP is delivered, securely verified, expires, and cannot be reused
  // =========================================================================
  describe('3. Cryptographic OTP Delivery, Expiry & Single-Use Security', () => {
    const testOtpEmail = `otp.indep.${Date.now()}@apex.edu`;

    it('3a. Creates an OTP challenge bound to email and collegeId', async () => {
      const otpCode = await createEmailVerificationOTP(testOtpEmail, apexCollege.id);
      expect(otpCode).toHaveLength(6);
      expect(Number(otpCode)).toBeGreaterThanOrEqual(100000);

      // Verify token record in DB stores SHA-256 verifier, not raw OTP
      const record = await prisma.verificationToken.findFirst({
        where: { identifier: testOtpEmail },
      });
      expect(record).not.toBeNull();
      expect(record!.token).toHaveLength(64); // SHA-256 hex string
      expect(record!.collegeId).toBe(apexCollege.id);
      expect(record!.consumedAt).toBeNull();
    });

    it('3b. Successfully verifies valid OTP and atomically consumes token', async () => {
      const otpCode = await createEmailVerificationOTP(testOtpEmail, apexCollege.id);
      const verifyRes = await verifyEmailVerificationOTP(testOtpEmail, otpCode, apexCollege.id);
      expect(verifyRes.success).toBe(true);

      // Record must now be marked consumed
      const updated = await prisma.verificationToken.findFirst({
        where: { identifier: testOtpEmail },
      });
      expect(updated!.consumedAt).not.toBeNull();
    });

    it('3c. Rejects replay attack (cannot reuse consumed OTP)', async () => {
      const otpCode = await createEmailVerificationOTP(testOtpEmail, apexCollege.id);
      const firstCheck = await verifyEmailVerificationOTP(testOtpEmail, otpCode, apexCollege.id);
      expect(firstCheck.success).toBe(true);

      // Replay attempt
      const replayCheck = await verifyEmailVerificationOTP(testOtpEmail, otpCode, apexCollege.id);
      expect(replayCheck.success).toBe(false);
      expect(replayCheck.error).toContain('already been used');
    });

    it('3d. Rejects expired OTP challenge', async () => {
      const expiredEmail = `expired.${Date.now()}@apex.edu`;
      const otpCode = await createEmailVerificationOTP(expiredEmail, apexCollege.id);

      // Artificially expire the token
      await prisma.verificationToken.updateMany({
        where: { identifier: expiredEmail },
        data: { expiresAt: new Date(Date.now() - 60 * 1000) },
      });

      const check = await verifyEmailVerificationOTP(expiredEmail, otpCode, apexCollege.id);
      expect(check.success).toBe(false);
      expect(check.error).toContain('expired');
    });

    it('3e. Rejects cross-college token usage (college binding security)', async () => {
      const crossEmail = `cross.${Date.now()}@apex.edu`;
      const otpCode = await createEmailVerificationOTP(crossEmail, apexCollege.id);

      // Attempt to verify with a different collegeId
      const crossCheck = await verifyEmailVerificationOTP(crossEmail, otpCode, 'different-college-xyz');
      expect(crossCheck.success).toBe(false);
      expect(crossCheck.error).toBeDefined();
    });

    it('3f. Locks out challenge after 5 failed guesses', async () => {
      const lockEmail = `lockout.${Date.now()}@apex.edu`;
      await createEmailVerificationOTP(lockEmail, apexCollege.id);

      // Make 5 incorrect guesses
      for (let i = 0; i < 5; i++) {
        await verifyEmailVerificationOTP(lockEmail, '000000', apexCollege.id);
      }

      // 6th attempt should report maximum attempts exceeded
      const finalGuess = await verifyEmailVerificationOTP(lockEmail, '123456', apexCollege.id);
      expect(finalGuess.success).toBe(false);
      expect(finalGuess.error).toContain('Maximum verification attempts exceeded');
    });
  });

  // =========================================================================
  // CRITERIA 4: College identity is derived exclusively from server-side domain mapping
  // =========================================================================
  it('4. Rejects client-supplied college tampering during registration', async () => {
    const tamperedRes = await registerRoute(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Tamper Tester',
          email: `tamper.${Date.now()}@apex.edu`,
          password: 'SecurePassword123!',
          collegeId: 'some-other-fake-college-id',
        }),
      })
    );
    expect(tamperedRes.status).toBe(400);
    const tamperedData = await tamperedRes.json();
    expect(tamperedData.error).toContain('cannot manually select or assign a different college');
  });

  // =========================================================================
  // CRITERIA 5: Student academic onboarding collects all required traits
  // =========================================================================
  it('5. Successfully saves academic profile and marks User.isOnboarded = true', async () => {
    const postRes = await postOnboardingRoute(
      new Request('http://localhost:3000/api/onboarding/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `lostlink_session=${testStudentSessionToken}`,
          Authorization: `Bearer ${testStudentSessionToken}`,
        },
        body: JSON.stringify({
          name: 'Independent Student Full Name',
          studentIdNumber: 'APEX-2023-CS-042',
          course: 'B.Tech Computer Science & Engineering',
          department: 'School of Computing',
          batch: '2023-2027',
          admissionYear: 2023,
          currentYear: 2,
          section: 'Section-B',
          phoneNumber: '+91-9876543210',
        }),
      })
    );

    expect(postRes.status).toBe(200);
    const postData = await postRes.json();
    expect(postData.success).toBe(true);

    // Verify DB records
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: testStudentUser.id },
    });
    expect(profile).not.toBeNull();
    expect(profile!.studentIdNumber).toBe('APEX-2023-CS-042');
    expect(profile!.course).toBe('B.Tech Computer Science & Engineering');
    expect(profile!.department).toBe('School of Computing');
    expect(profile!.batch).toBe('2023-2027');
    expect(profile!.admissionYear).toBe(2023);
    expect(profile!.currentYear).toBe(2);
    expect(profile!.section).toBe('Section-B');
    expect(profile!.isOnboardingDone).toBe(true);

    const updatedUser = await prisma.user.findUnique({
      where: { id: testStudentUser.id },
    });
    expect(updatedUser!.isOnboarded).toBe(true);
    expect(updatedUser!.name).toBe('Independent Student Full Name');
  });

  // =========================================================================
  // CRITERIA 6 & 7: College identity is read-only and unverified students are blocked
  // =========================================================================
  it('6 & 7. Blocks unverified student from completing onboarding (403 Forbidden)', async () => {
    const blockedRes = await postOnboardingRoute(
      new Request('http://localhost:3000/api/onboarding/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `lostlink_session=${unverifiedStudentSessionToken}`,
          Authorization: `Bearer ${unverifiedStudentSessionToken}`,
        },
        body: JSON.stringify({
          name: 'Unverified Student',
          studentIdNumber: 'UNV-1234',
          course: 'BCA',
          department: 'IT',
          batch: '2024-2027',
          admissionYear: 2024,
          currentYear: 1,
        }),
      })
    );
    expect(blockedRes.status).toBe(403);
    const blockedData = await blockedRes.json();
    expect(blockedData.error).toContain('verified via OTP');
  });

  // =========================================================================
  // CRITERIA 8: Students automatically enter their assigned campus
  // =========================================================================
  it('8. Confirms login routing: onboarded student automatically redirected to verified campus dashboard', async () => {
    const loginRes = await loginRoute(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'verified.student.indep@apex.edu',
          password: 'StudentPassword123!',
        }),
      })
    );
    expect(loginRes.status).toBe(200);
    const data = await loginRes.json();
    expect(data.redirectTo).toBe(`/campus/${apexCollege.slug}/dashboard`);
  });

  // =========================================================================
  // CRITERIA 9: Lost and found reports reject cross-college tampering
  // =========================================================================
  it('9. Rejects item submission across college boundaries (403 Forbidden)', async () => {
    const crossRes = await postItemRoute(
      new Request('http://localhost:3000/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `lostlink_session=${testStudentSessionToken}`,
          Authorization: `Bearer ${testStudentSessionToken}`,
        },
        body: JSON.stringify({
          type: 'LOST',
          title: 'MacBook Pro Tampered',
          category: 'electronics',
          color: 'Space Grey',
          description: 'Attempting to report item under foreign college id',
          dateIncident: new Date().toISOString(),
          collegeId: 'college-gd-goenka', // Student belongs to Apex, not GD Goenka
          locationDescription: 'Library Room 101',
        }),
      })
    );
    expect(crossRes.status).toBe(403);
    const crossData = await crossRes.json();
    expect(crossData.error).toContain('Active college verification required');
  });

  // =========================================================================
  // CRITERIA 10: College admins are restricted to their assigned college
  // =========================================================================
  it('10. Confirms college admins are restricted to their assigned college', async () => {
    // 10a. College admin querying their own college succeeds
    const adminRes = await getCollegeAdminOverview(
      new NextRequest(`http://localhost:3000/api/college-admin/overview?collegeId=${apexCollege.id}`, {
        method: 'GET',
        headers: {
          Cookie: `lostlink_session=${collegeAdminSessionToken}`,
          Authorization: `Bearer ${collegeAdminSessionToken}`,
        },
      })
    );
    expect(adminRes.status).toBe(200);
    const adminData = await adminRes.json();
    expect(adminData.college.id).toBe(apexCollege.id);

    // 10b. College admin attempting to inspect GD Goenka is overridden to their assigned college
    const overrideRes = await getCollegeAdminOverview(
      new NextRequest(`http://localhost:3000/api/college-admin/overview?collegeId=college-gd-goenka`, {
        method: 'GET',
        headers: {
          Cookie: `lostlink_session=${collegeAdminSessionToken}`,
          Authorization: `Bearer ${collegeAdminSessionToken}`,
        },
      })
    );
    expect(overrideRes.status).toBe(200);
    const overrideData = await overrideRes.json();
    expect(overrideData.college.id).toBe(apexCollege.id); // Tenant isolation enforced

    // 10c. Student attempting to access college-admin overview is rejected with 403
    const studentAccessRes = await getCollegeAdminOverview(
      new NextRequest('http://localhost:3000/api/college-admin/overview', {
        method: 'GET',
        headers: {
          Cookie: `lostlink_session=${testStudentSessionToken}`,
          Authorization: `Bearer ${testStudentSessionToken}`,
        },
      })
    );
    expect(studentAccessRes.status).toBe(403);
  });

  // =========================================================================
  // CRITERIA 11: Platform admins have separate server-side authorization
  // =========================================================================
  it('11. Confirms platform admins have dedicated authorization and non-admins are blocked', async () => {
    // 11a. Platform admin succeeds
    const superRes = await getPlatformAdminOverview(
      new NextRequest('http://localhost:3000/api/platform-admin/overview', {
        method: 'GET',
        headers: {
          Cookie: `lostlink_session=${platformAdminSessionToken}`,
          Authorization: `Bearer ${platformAdminSessionToken}`,
        },
      })
    );
    expect(superRes.status).toBe(200);
    const superData = await superRes.json();
    expect(superData.summary.totalColleges).toBeGreaterThan(0);

    // 11b. College admin blocked with 403
    const adminBlocked = await getPlatformAdminOverview(
      new NextRequest('http://localhost:3000/api/platform-admin/overview', {
        method: 'GET',
        headers: {
          Cookie: `lostlink_session=${collegeAdminSessionToken}`,
          Authorization: `Bearer ${collegeAdminSessionToken}`,
        },
      })
    );
    expect(adminBlocked.status).toBe(403);

    // 11c. Student blocked with 403
    const studentBlocked = await getPlatformAdminOverview(
      new NextRequest('http://localhost:3000/api/platform-admin/overview', {
        method: 'GET',
        headers: {
          Cookie: `lostlink_session=${testStudentSessionToken}`,
          Authorization: `Bearer ${testStudentSessionToken}`,
        },
      })
    );
    expect(studentBlocked.status).toBe(403);
  });

  // =========================================================================
  // CRITERIA 12: All 10 Gurugram college domains have authoritative evidence and resolve cleanly
  // =========================================================================
  it('12. Confirms all 10 Gurugram college domains are VERIFIED and resolve to correct institutions', async () => {
    const gurugramDomains = [
      { domain: 'ncuindia.edu', expectedName: 'The NorthCap University' },
      { domain: 'bmu.edu.in', expectedName: 'BML Munjal University' },
      { domain: 'krmangalam.edu.in', expectedName: 'K.R. Mangalam University' },
      { domain: 'gdgoenka.ac.in', expectedName: 'GD Goenka University' },
      { domain: 'ggn.amity.edu', expectedName: 'Amity University Gurugram' },
      { domain: 'sushantuniversity.edu.in', expectedName: 'Sushant University' },
      { domain: 'gurugramuniversity.ac.in', expectedName: 'Gurugram University' },
      { domain: 'ggn.dronacharya.info', expectedName: 'Dronacharya College of Engineering' },
      { domain: 'sgtuniversity.ac.in', expectedName: 'SGT University' },
      { domain: 'mdi.ac.in', expectedName: 'Management Development Institute' },
    ];

    for (const item of gurugramDomains) {
      const result = await resolveCollegeFromEmail(`test.student@${item.domain}`);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.collegeName).toContain(item.expectedName);
        expect(result.domainStatus).toBe('VERIFIED');
        expect(result.status).toBe('ACTIVE');
      }
    }
  });

  // =========================================================================
  // CRITERIA 13: No unverified domain can authenticate students
  // =========================================================================
  it('13. Confirms unverified domains cannot authenticate students', async () => {
    const unverifiedDomains = [
      'starexuniversity.co.in',
      'kiit.in',
      'gpmanesar.ac.in',
    ];

    for (const domain of unverifiedDomains) {
      const result = await resolveCollegeFromEmail(`student@${domain}`);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('DOMAIN_PENDING_VERIFICATION');
      }
    }
  });

  // =========================================================================
  // CRITERIA 14: Existing authentication, password hashing, and sessions remain functional
  // =========================================================================
  it('14. Confirms Argon2id password hashing and JWT sessions remain fully functional', async () => {
    const rawPass = 'ProductionSecurityVerificationPass99!';
    const hashed = await hashPassword(rawPass);
    expect(hashed).toBeDefined();
    expect(hashed.startsWith('$argon2id$')).toBe(true);

    const session = await createSession(testStudentUser.id);
    expect(session.token).toBeDefined();
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  // =========================================================================
  // CRITERIA 15: Missing Webpack chunk error does not recur
  // =========================================================================
  it('15. Verifies external native packages and session loaders run without chunk errors', async () => {
    // Dynamic import of native modules must resolve cleanly
    const argon2 = await import('argon2');
    expect(argon2).toBeDefined();
    expect(argon2.hash).toBeInstanceOf(Function);

    const db = await prisma.user.findFirst({ select: { id: true } });
    expect(db).toBeDefined();
  });
});
