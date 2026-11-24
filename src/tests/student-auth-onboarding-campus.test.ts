import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession, getCurrentUser } from '@/lib/auth/session';
import { resolveCollegeFromEmail } from '@/lib/college/resolve-college';
import { createEmailVerificationOTP, verifyEmailVerificationOTP } from '@/lib/auth/emailVerification';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as verifyCollegeRoute } from '@/app/api/auth/verify-college/route';
import { POST as sendOtpRoute } from '@/app/api/auth/send-registration-otp/route';
import { GET as getOnboardingRoute, POST as postOnboardingRoute } from '@/app/api/onboarding/student/route';
import { POST as createItemRoute, GET as getItemsRoute } from '@/app/api/items/route';
import { requireCollegeAdmin, requirePlatformAdmin } from '@/lib/auth/tenant';
import { CollegeStatus, DomainStatus, MembershipStatus, UserRole } from '@prisma/client';

describe('LostLink Student Authentication, Onboarding & Campus Isolation Test Suite', () => {
  let collegeA: any;
  let collegeB: any;
  let pendingCollege: any;
  let inactiveCollege: any;
  let studentA: any;
  let studentB: any;
  let sessionTokenA: string;
  let sessionTokenB: string;

  beforeAll(async () => {
    // 1. Create or ensure College A (Apex Tech)
    collegeA = await prisma.college.upsert({
      where: { slug: 'test-apex-suite' },
      update: {},
      create: {
        name: 'Apex Test University',
        shortName: 'Apex',
        slug: 'test-apex-suite',
        emailDomains: ['test-apex.edu', 'apex-alumni.edu'],
        city: 'Palo Alto',
        state: 'California',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
        campuses: {
          create: {
            name: 'Apex Main Campus',
            code: 'APX-TEST-MAIN',
            addressLabel: '100 Innovation Way',
          },
        },
      },
      include: { campuses: true },
    });

    await prisma.collegeEmailDomain.upsert({
      where: { domain: 'test-apex.edu' },
      update: { verificationStatus: DomainStatus.VERIFIED },
      create: {
        collegeId: collegeA.id,
        domain: 'test-apex.edu',
        verificationStatus: DomainStatus.VERIFIED,
        verifiedAt: new Date(),
        isPrimary: true,
      },
    });

    await prisma.collegeEmailDomain.upsert({
      where: { domain: 'apex-alumni.edu' },
      update: { verificationStatus: DomainStatus.VERIFIED },
      create: {
        collegeId: collegeA.id,
        domain: 'apex-alumni.edu',
        verificationStatus: DomainStatus.VERIFIED,
        verifiedAt: new Date(),
        isPrimary: false,
      },
    });

    // 2. Create College B (Horizon Tech)
    collegeB = await prisma.college.upsert({
      where: { slug: 'test-horizon-suite' },
      update: {},
      create: {
        name: 'Horizon Test Institute',
        shortName: 'Horizon',
        slug: 'test-horizon-suite',
        emailDomains: ['test-horizon.edu'],
        city: 'Cambridge',
        state: 'Massachusetts',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
        campuses: {
          create: {
            name: 'Horizon Main Campus',
            code: 'HRZ-TEST-MAIN',
            addressLabel: '77 Cyber Way',
          },
        },
      },
      include: { campuses: true },
    });

    await prisma.collegeEmailDomain.upsert({
      where: { domain: 'test-horizon.edu' },
      update: { verificationStatus: DomainStatus.VERIFIED },
      create: {
        collegeId: collegeB.id,
        domain: 'test-horizon.edu',
        verificationStatus: DomainStatus.VERIFIED,
        verifiedAt: new Date(),
        isPrimary: true,
      },
    });

    // 3. Create Pending College
    pendingCollege = await prisma.college.upsert({
      where: { slug: 'test-pending-suite' },
      update: {},
      create: {
        name: 'Pending Audit College',
        slug: 'test-pending-suite',
        emailDomains: ['test-pending.edu'],
        city: 'Gurugram',
        state: 'Haryana',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'PENDING_VERIFICATION',
      },
    });

    await prisma.collegeEmailDomain.upsert({
      where: { domain: 'test-pending.edu' },
      update: { verificationStatus: DomainStatus.PENDING_VERIFICATION },
      create: {
        collegeId: pendingCollege.id,
        domain: 'test-pending.edu',
        verificationStatus: DomainStatus.PENDING_VERIFICATION,
        isPrimary: true,
      },
    });

    // 4. Create Inactive College
    inactiveCollege = await prisma.college.upsert({
      where: { slug: 'test-inactive-suite' },
      update: {},
      create: {
        name: 'Inactive Test College',
        slug: 'test-inactive-suite',
        emailDomains: ['test-inactive.edu'],
        city: 'New York',
        state: 'New York',
        status: CollegeStatus.SUSPENDED,
        domainVerificationStatus: 'VERIFIED',
      },
    });

    await prisma.collegeEmailDomain.upsert({
      where: { domain: 'test-inactive.edu' },
      update: {},
      create: {
        collegeId: inactiveCollege.id,
        domain: 'test-inactive.edu',
        verificationStatus: DomainStatus.VERIFIED,
        isPrimary: true,
      },
    });

    // 5. Seed verified Student A in College A
    studentA = await prisma.user.upsert({
      where: { email: 'studenta@test-apex.edu' },
      update: {
        passwordHash: await hashPassword('ApexSecurePass123!'),
        isOnboarded: false,
      },
      create: {
        name: 'Student Alpha',
        email: 'studenta@test-apex.edu',
        passwordHash: await hashPassword('ApexSecurePass123!'),
        role: UserRole.STUDENT,
        status: 'ACTIVE',
        emailVerified: new Date(),
        isOnboarded: false,
        memberships: {
          create: {
            collegeId: collegeA.id,
            status: MembershipStatus.VERIFIED,
            verifiedAt: new Date(),
          },
        },
      },
      include: { memberships: true },
    });

    const sessionA = await createSession(studentA.id);
    sessionTokenA = sessionA.token;

    // 6. Seed verified Student B in College B
    studentB = await prisma.user.upsert({
      where: { email: 'studentb@test-horizon.edu' },
      update: {
        passwordHash: await hashPassword('HorizonSecurePass123!'),
        isOnboarded: true,
      },
      create: {
        name: 'Student Beta',
        email: 'studentb@test-horizon.edu',
        passwordHash: await hashPassword('HorizonSecurePass123!'),
        role: UserRole.STUDENT,
        status: 'ACTIVE',
        emailVerified: new Date(),
        isOnboarded: true,
        memberships: {
          create: {
            collegeId: collegeB.id,
            status: MembershipStatus.VERIFIED,
            verifiedAt: new Date(),
          },
        },
      },
      include: { memberships: true },
    });

    const sessionB = await createSession(studentB.id);
    sessionTokenB = sessionB.token;
  });

  // ============================================================================
  // 1. COLLEGE DETECTION & DOMAIN RESOLUTION TESTS
  // ============================================================================
  describe('College Auto-Detection & Domain Verification', () => {
    it('correctly maps email to college without relying on client parameters', async () => {
      const res = await resolveCollegeFromEmail('student@test-apex.edu');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.collegeId).toBe(collegeA.id);
        expect(res.collegeName).toBe(collegeA.name);
        expect(res.domain).toBe('test-apex.edu');
      }
    });

    it('supports multiple verified domains for a single institution', async () => {
      const res = await resolveCollegeFromEmail('scholar@apex-alumni.edu');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.collegeId).toBe(collegeA.id);
      }
    });

    it('normalizes uppercase emails and ignores surrounding whitespace', async () => {
      const res = await resolveCollegeFromEmail('  STUDENT.JOHN@TEST-APEX.EDU  ');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.collegeId).toBe(collegeA.id);
      }
    });

    it('strictly rejects personal Gmail addresses', async () => {
      const res = await resolveCollegeFromEmail('personal.user@gmail.com');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('PUBLIC_EMAIL_PROVIDER');
      }
    });

    it('strictly rejects unregistered / unknown educational domains', async () => {
      const res = await resolveCollegeFromEmail('user@unknown-fake-college.edu');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('UNREGISTERED_DOMAIN');
      }
    });

    it('rejects domains whose verification status is PENDING_VERIFICATION', async () => {
      const res = await resolveCollegeFromEmail('student@test-pending.edu');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('DOMAIN_PENDING_VERIFICATION');
      }
    });

    it('rejects domains associated with an inactive or suspended college', async () => {
      const res = await resolveCollegeFromEmail('student@test-inactive.edu');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('COLLEGE_INACTIVE');
      }
    });
  });

  // ============================================================================
  // 2. REGISTRATION & OTP VERIFICATION FLOW TESTS
  // ============================================================================
  describe('Student Registration & OTP Verification Flow', () => {
    it('send-registration-otp dispatches OTP for valid institutional email', async () => {
      const uniqueEmail = `newstudent.${Date.now()}@test-apex.edu`;
      const req = new Request('http://localhost:3000/api/auth/send-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: uniqueEmail }),
      });

      const res = await sendOtpRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.college.id).toBe(collegeA.id);
    });

    it('send-registration-otp rejects Gmail addresses with 400', async () => {
      const req = new Request('http://localhost:3000/api/auth/send-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'intruder@gmail.com' }),
      });

      const res = await sendOtpRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain('Personal email addresses');
    });

    it('registration with valid OTP creates pre-verified student account and redirects to onboarding', async () => {
      const email = `verified.student.${Date.now()}@test-apex.edu`;
      const rawOtp = await createEmailVerificationOTP(email, collegeA.id);

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Verified Onboarding Cadet',
          email,
          password: 'SecurePassword123!',
          otp: rawOtp,
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.redirectTo).toBe('/onboarding/student');
      expect(data.user.collegeId).toBe(collegeA.id);
      expect(data.user.emailVerified).toBe(true);
      expect(data.user.membershipStatus).toBe('VERIFIED');
    });

    it('registration rejects client-supplied fake or cross-institution collegeId', async () => {
      const email = `cross.attempt.${Date.now()}@test-apex.edu`;
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'College Tamperer',
          email,
          password: 'SecurePassword123!',
          collegeId: collegeB.id, // Tampered college ID
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain('is not authorized');
    });
  });

  // ============================================================================
  // 3. LOGIN & CREDENTIAL AUTHENTICATION TESTS
  // ============================================================================
  describe('Student Login & Session Handling', () => {
    it('authenticates valid student credentials and redirects incomplete onboarding to /onboarding/student', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentA.email,
          password: 'ApexSecurePass123!',
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.user.id).toBe(studentA.id);
      // Student A has not completed onboarding yet
      expect(data.redirectTo).toBe('/onboarding/student');
    });

    it('authenticates onboarded student and redirects to campus dashboard', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentB.email,
          password: 'HorizonSecurePass123!',
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.redirectTo).toBe(`/campus/${collegeB.slug}/dashboard`);
    });

    it('rejects incorrect password with 401', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentA.email,
          password: 'WrongPassword999!',
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(401);
    });

    it('rejects suspended student accounts with 403', async () => {
      const suspendedUser = await prisma.user.create({
        data: {
          name: 'Suspended Student',
          email: `suspended.${Date.now()}@test-apex.edu`,
          passwordHash: await hashPassword('ValidPass123!'),
          role: UserRole.STUDENT,
          status: 'SUSPENDED',
        },
      });

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: suspendedUser.email,
          password: 'ValidPass123!',
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // 4. STUDENT ONBOARDING API TESTS
  // ============================================================================
  describe('Student Academic Onboarding API (/api/onboarding/student)', () => {
    it('GET returns authenticated student details and read-only verified college', async () => {
      const req = new Request('http://localhost:3000/api/onboarding/student', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${sessionTokenA}`,
        },
      });

      const res = await getOnboardingRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.student.email).toBe(studentA.email);
      expect(data.student.college.id).toBe(collegeA.id);
      expect(data.student.college.name).toBe(collegeA.name);
    });

    it('POST rejects onboarding when required academic fields are missing', async () => {
      const req = new Request('http://localhost:3000/api/onboarding/student', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${sessionTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Student Alpha',
          // Missing studentIdNumber, course, department, batch
        }),
      });

      const res = await postOnboardingRoute(req);
      expect(res.status).toBe(400);
    });

    it('POST successfully registers student academic profile and marks isOnboarded true', async () => {
      const req = new Request('http://localhost:3000/api/onboarding/student', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${sessionTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Student Alpha Verified',
          studentIdNumber: 'APX-2027-CS09',
          course: 'B.Tech Computer Science & AI',
          department: 'Department of Computing',
          batch: '2023-2027',
          admissionYear: 2023,
          currentYear: 2,
          section: 'CSE-1',
          phoneNumber: '+1-555-0199',
        }),
      });

      const res = await postOnboardingRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.redirectTo).toContain(collegeA.slug);

      // Verify database record
      const updatedUser = await prisma.user.findUnique({
        where: { id: studentA.id },
        include: { studentProfile: true },
      });

      expect(updatedUser?.isOnboarded).toBe(true);
      expect(updatedUser?.studentProfile?.course).toBe('B.Tech Computer Science & AI');
      expect(updatedUser?.studentProfile?.studentIdNumber).toBe('APX-2027-CS09');
    });
  });

  // ============================================================================
  // 5. STRICT COLLEGE ISOLATION & ACCESS CONTROL TESTS
  // ============================================================================
  describe('Strict College Tenant Isolation & Privilege Protection', () => {
    it('strictly prevents student from submitting report to an unassigned college', async () => {
      const req = new Request('http://localhost:3000/api/items', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${sessionTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'LOST',
          title: 'Lost Calculator FX-991',
          category: 'electronics',
          color: 'Black',
          description: 'Left in main classroom pod during calculus lecture',
          dateIncident: new Date().toISOString(),
          collegeId: collegeB.id, // Student A tries to submit report for College B!
          locationDescription: 'Stratton Rm 401',
        }),
      });

      const res = await createItemRoute(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.error).toContain('Active college verification required');
    });

    it('creates lost report strictly bound to student verified college', async () => {
      const req = new Request('http://localhost:3000/api/items', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${sessionTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'LOST',
          title: 'Lost Calculator FX-991',
          category: 'electronics',
          color: 'Black',
          description: 'Left in main classroom pod during calculus lecture',
          dateIncident: new Date().toISOString(),
          collegeId: collegeA.id,
          locationDescription: 'Alan Turing Memorial Hall Rm 102',
        }),
      });

      const res = await createItemRoute(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      const createdItem = await prisma.item.findUnique({ where: { id: data.item.id } });
      expect(createdItem?.collegeId).toBe(collegeA.id);
    });

    it('student in College A cannot access College B items via tenant-filtered API', async () => {
      // Create an item in College B
      const itemB = await prisma.item.create({
        data: {
          reportNumber: `LL-TEST-B-${Date.now()}`,
          reporterId: studentB.id,
          collegeId: collegeB.id,
          campusId: collegeB.campuses[0].id,
          type: 'LOST',
          name: 'College B Secret Ledger',
          category: 'documents',
          color: 'Blue',
          description: 'Confidential project folder at Horizon',
          occurredAt: new Date(),
          locationBuilding: 'Stratton Center Rm 401',
          status: 'OPEN',
        },
      });

      // Filter query for College A items
      const req = new Request(`http://localhost:3000/api/items?collegeId=${collegeA.id}`);
      const res = await getItemsRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      const itemIds = data.items.map((i: any) => i.id);
      expect(itemIds).not.toContain(itemB.id);
    });

    it('students are strictly barred from college-admin role functions with 403', async () => {
      const userA = await getCurrentUser(new Request('http://localhost:3000', {
        headers: { authorization: `Bearer ${sessionTokenA}` },
      }));

      expect(userA).toBeDefined();
      expect(userA?.role).toBe(UserRole.STUDENT);

      expect(() => {
        requireCollegeAdmin(userA!, collegeA.id);
      }).toThrow(/College administrative privileges required/);
    });

    it('students are strictly barred from platform-admin functions with 403', async () => {
      const userA = await getCurrentUser(new Request('http://localhost:3000', {
        headers: { authorization: `Bearer ${sessionTokenA}` },
      }));

      expect(() => {
        requirePlatformAdmin(userA!);
      }).toThrow(/Platform administrator privileges required/);
    });
  });
});
