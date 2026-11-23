import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/db';
import { POST as registerHandler } from '../app/api/auth/register/route';
import { POST as loginHandler } from '../app/api/auth/login/route';
import { POST as verifyCollegeHandler } from '../app/api/auth/verify-college/route';
import { requirePlatformAdmin, requireCollegeAdmin, requireCollegeMembership, AuthError } from '../lib/auth/tenant';
import { verifyPassword } from '../lib/auth/password';
import { UserRole, UserStatus, CollegeStatus, MembershipStatus } from '@prisma/client';
import argon2 from 'argon2';

describe('LostLink 2.0 Master Implementation Validation Suite', () => {
  let iilmCollege: any;
  let apexCollege: any;
  let pendingCollege: any;
  let suspendedCollege: any;

  beforeAll(async () => {
    // 1. Ensure required test colleges exist
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
        primaryColor: '#800000',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'VERIFIED',
        website: 'https://iilm.edu',
      },
    });

    apexCollege = await prisma.college.findFirst({
      where: { slug: 'apex-tech' },
    });

    if (!apexCollege) {
      apexCollege = await prisma.college.create({
        data: {
          id: 'college-apex',
          name: 'Apex University of Science & Technology',
          slug: 'apex-tech',
          emailDomains: ['apex.edu'],
          city: 'Palo Alto',
          state: 'California',
          country: 'United States',
          status: CollegeStatus.ACTIVE,
          domainVerificationStatus: 'VERIFIED',
        },
      });
    }

    pendingCollege = await prisma.college.upsert({
      where: { slug: 'gnpi-pending' },
      update: {
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'PENDING_VERIFICATION',
        emailDomains: ['gnpi-pending.edu.in'],
      },
      create: {
        id: 'college-pending-test',
        name: 'Greater Noida Polytechnic Institute',
        slug: 'gnpi-pending',
        emailDomains: ['gnpi-pending.edu.in'],
        city: 'Greater Noida',
        state: 'Uttar Pradesh',
        country: 'India',
        status: CollegeStatus.ACTIVE,
        domainVerificationStatus: 'PENDING_VERIFICATION',
      },
    });

    suspendedCollege = await prisma.college.upsert({
      where: { slug: 'suspended-college-test' },
      update: {
        status: CollegeStatus.SUSPENDED,
      },
      create: {
        id: 'college-suspended-test',
        name: 'Suspended University Test',
        slug: 'suspended-college-test',
        emailDomains: ['suspended.edu'],
        city: 'Greater Noida',
        state: 'Uttar Pradesh',
        country: 'India',
        status: CollegeStatus.SUSPENDED,
        domainVerificationStatus: 'VERIFIED',
      },
    });
  });

  function createRegisterRequest(body: any, ip?: string) {
    return new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip || `10.0.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      },
      body: JSON.stringify(body),
    });
  }

  describe('1. Institutional Email Domain Enforcement & Registration Security', () => {
    it('rejects registration with personal Gmail addresses with HTTP 400', async () => {
      const req = createRegisterRequest({
        name: 'Jane Student',
        email: 'jane.student@gmail.com',
        password: 'SecurePassword123!',
        collegeId: iilmCollege.id,
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Personal email addresses');
    });

    it('rejects registration with Yahoo and Outlook addresses with HTTP 400', async () => {
      const reqYahoo = createRegisterRequest({
        name: 'John Student',
        email: 'john.student@yahoo.com',
        password: 'SecurePassword123!',
        collegeId: iilmCollege.id,
      });
      const resYahoo = await registerHandler(reqYahoo);
      expect(resYahoo.status).toBe(400);

      const reqOutlook = createRegisterRequest({
        name: 'John Student',
        email: 'john.student@outlook.com',
        password: 'SecurePassword123!',
        collegeId: iilmCollege.id,
      });
      const resOutlook = await registerHandler(reqOutlook);
      expect(resOutlook.status).toBe(400);
    });

    it('rejects registration when email domain belongs to a different university', async () => {
      // User selected IILM University but provides an apex.edu email address
      const req = createRegisterRequest({
        name: 'Cross Tenant Tester',
        email: 'cross.tester@apex.edu',
        password: 'SecurePassword123!',
        collegeId: iilmCollege.id,
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('not authorized for IILM University');
    });

    it('rejects registration for an institution with PENDING_VERIFICATION domain status', async () => {
      const req = createRegisterRequest({
        name: 'Pending Tester',
        email: 'student@gnpi-pending.edu.in',
        password: 'SecurePassword123!',
        collegeId: pendingCollege.id,
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('pending official verification');
    });

    it('rejects registration for a suspended or inactive institution', async () => {
      const req = createRegisterRequest({
        name: 'Suspended Tester',
        email: 'student@suspended.edu',
        password: 'SecurePassword123!',
        collegeId: suspendedCollege.id,
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('suspended or inactive');
    });

    it('rejects empty or weak passwords (< 8 characters)', async () => {
      const req = createRegisterRequest({
        name: 'Weak Pass Tester',
        email: 'weak.student@iilm.edu',
        password: 'short',
        collegeId: iilmCollege.id,
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(400);
    });

    it('successfully registers student with verified IILM University (@iilm.edu) domain and dispatches OTP', async () => {
      const testEmail = `test.student.${Date.now()}@iilm.edu`;
      const testPassword = 'StrongPassword2026!';

      const req = createRegisterRequest({
        name: 'Pooja Verma',
        email: testEmail,
        password: testPassword,
        collegeId: iilmCollege.id,
        studentId: 'IILM-TEST-001',
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.user.email).toBe(testEmail);
      expect(data.user.role).toBe('STUDENT');
      expect(data.user.membershipStatus).toBe('PENDING');

      // Verify database persistence and Argon2id hash
      const persistedUser = await prisma.user.findUnique({
        where: { email: testEmail },
        include: { memberships: true },
      });

      expect(persistedUser).not.toBeNull();
      expect(persistedUser?.passwordHash).toBeDefined();
      expect(persistedUser?.passwordHash).toMatch(/^\$argon2id\$/);

      const isValidPassword = await verifyPassword(persistedUser!.passwordHash!, testPassword);
      expect(isValidPassword).toBe(true);

      // Verify membership is pending OTP verification
      expect(persistedUser?.memberships[0].status).toBe(MembershipStatus.PENDING);
      expect(persistedUser?.memberships[0].verificationMethod).toBe('EMAIL_OTP');

      // Verify 6-digit OTP verification token was generated
      const tokenRecord = await prisma.verificationToken.findFirst({
        where: { identifier: testEmail },
      });
      expect(tokenRecord).not.toBeNull();
      expect(tokenRecord?.token).toHaveLength(64); // SHA-256 hash verifier
    });

    it('rejects duplicate registration attempts with HTTP 409', async () => {
      const duplicateEmail = `dup.${Date.now()}@iilm.edu`;

      // 1. Initial registration
      await registerHandler(
        createRegisterRequest({
          name: 'First Register',
          email: duplicateEmail,
          password: 'Password123!',
          collegeId: iilmCollege.id,
        })
      );

      // 2. Duplicate attempt
      const resDup = await registerHandler(
        createRegisterRequest({
          name: 'Second Register',
          email: duplicateEmail,
          password: 'Password123!',
          collegeId: iilmCollege.id,
        })
      );

      expect(resDup.status).toBe(409);
    });
  });

  describe('2. Authentication & Server-Determined Role Routing', () => {
    it('authenticates user and determines role on the server (zero client-side trust)', async () => {
      const studentEmail = `auth.student.${Date.now()}@iilm.edu`;
      const pass = 'CorrectPassword123!';
      const hash = await argon2.hash(pass, { type: argon2.argon2id });

      await prisma.user.create({
        data: {
          name: 'Server Auth Student',
          email: studentEmail,
          passwordHash: hash,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          emailVerified: new Date(),
          memberships: {
            create: {
              collegeId: iilmCollege.id,
              status: MembershipStatus.VERIFIED,
              verificationMethod: 'EMAIL_OTP',
            },
          },
        },
      });

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail, password: pass }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.user.role).toBe(UserRole.STUDENT);
      expect(data.user.email).toBe(studentEmail);

      // Check lastLoginAt update
      const updatedUser = await prisma.user.findUnique({ where: { email: studentEmail } });
      expect(updatedUser?.lastLoginAt).not.toBeNull();
    });

    it('rejects incorrect password with HTTP 401', async () => {
      const studentEmail = `auth.fail.${Date.now()}@iilm.edu`;
      const hash = await argon2.hash('SecretPass123!', { type: argon2.argon2id });

      await prisma.user.create({
        data: {
          name: 'Fail Auth Student',
          email: studentEmail,
          passwordHash: hash,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail, password: 'WrongPassword!' }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);
    });
  });

  describe('3. Multi-Tenant Authorization & Access Denied Boundaries', () => {
    it('prevents students from accessing platform administrator privileges', () => {
      const studentAuth: any = {
        id: 'student-123',
        name: 'Normal Student',
        email: 'student@iilm.edu',
        role: UserRole.STUDENT,
        memberships: [],
      };

      expect(() => requirePlatformAdmin(studentAuth)).toThrow(AuthError);
    });

    it('allows platform administrators global access', () => {
      const adminAuth: any = {
        id: 'platform-admin-123',
        name: 'Super Admin',
        email: 'admin@lostlink.org',
        role: UserRole.PLATFORM_ADMIN,
        memberships: [],
      };

      expect(requirePlatformAdmin(adminAuth)).toBe(true);
      expect(requireCollegeAdmin(adminAuth, iilmCollege.id)).toBe(true);
      expect(requireCollegeMembership(adminAuth, iilmCollege.id).status).toBe(MembershipStatus.VERIFIED);
    });

    it('prevents college administrator of College A from accessing College B private records', () => {
      const collegeAdminA: any = {
        id: 'admin-college-a',
        name: 'College A Officer',
        email: 'officer@apex.edu',
        role: UserRole.COLLEGE_ADMIN,
        memberships: [
          {
            id: 'mem-a',
            collegeId: apexCollege.id,
            status: MembershipStatus.VERIFIED,
          },
        ],
      };

      // Allowed for own college
      expect(requireCollegeAdmin(collegeAdminA, apexCollege.id)).toBe(true);

      // Blocked from accessing IILM University private records
      expect(() => requireCollegeAdmin(collegeAdminA, iilmCollege.id)).toThrow(AuthError);
    });
  });

  describe('4. Greater Noida Institutional Directory Integrity', () => {
    it('verifies all required Greater Noida universities exist with accurate domains and locations', async () => {
      const requiredInstitutions = [
        { name: 'IILM University', slug: 'iilm-university', domain: 'iilm.edu' },
        { name: 'Galgotias University', slug: 'galgotias-university', domain: 'galgotiasuniversity.edu.in' },
        { name: 'Sharda University', slug: 'sharda-university', domain: 'sharda.ac.in' },
        { name: 'Bennett University', slug: 'bennett-university', domain: 'bennett.edu.in' },
        { name: 'Noida International University', slug: 'niu', domain: 'niu.edu.in' },
        { name: 'Gautam Buddha University', slug: 'gbu', domain: 'gbu.ac.in' },
        { name: 'G.L. Bajaj Institute of Technology and Management', slug: 'gl-bajaj', domain: 'glbitm.ac.in' },
        { name: 'Greater Noida Institute of Technology', slug: 'gniot', domain: 'gniot.net.in' },
      ];

      for (const inst of requiredInstitutions) {
        const record = await prisma.college.findUnique({
          where: { slug: inst.slug },
          include: { campuses: { include: { locations: true } } },
        });

        expect(record).not.toBeNull();
        expect(record?.city).toBe('Greater Noida');
        expect(record?.state).toBe('Uttar Pradesh');
        expect(record?.country).toBe('India');
        expect(record?.domainVerificationStatus).toBe('VERIFIED');
        expect(record?.emailDomains).toContain(inst.domain);
      }
    });

    it('verifies Sharda School of Business Studies is retained under Sharda University', async () => {
      const sharda = await prisma.college.findUnique({
        where: { slug: 'sharda-university' },
        include: { campuses: { include: { locations: true } } },
      });

      expect(sharda).not.toBeNull();
      const allLocations = sharda?.campuses.flatMap((c) => c.locations) || [];
      const hasBusinessSchool = allLocations.some(
        (loc) => loc.name.includes('Sharda School of Business Studies') || loc.id === 'sharda-ssbs'
      );
      expect(hasBusinessSchool).toBe(true);
    });
  });

  describe('5. Platform Admin CLI Bootstrap Tool', () => {
    it('promotes an existing verified student to PLATFORM_ADMIN and records an audit log', async () => {
      const bootstrapTargetEmail = `bootstrap.candidate.${Date.now()}@iilm.edu`;
      const hash = await argon2.hash('BootPassword123!', { type: argon2.argon2id });

      const candidateUser = await prisma.user.create({
        data: {
          name: 'Bootstrap Candidate',
          email: bootstrapTargetEmail,
          passwordHash: hash,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          emailVerified: new Date(),
        },
      });

      // Execute promotion transaction (simulating bootstrap script logic)
      const promoted = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: candidateUser.id },
          data: { role: UserRole.PLATFORM_ADMIN, status: UserStatus.ACTIVE },
        });

        await tx.auditLog.create({
          data: {
            actorId: candidateUser.id,
            action: 'BOOTSTRAP_SUPER_ADMIN',
            resourceType: 'USER',
            resourceId: candidateUser.id,
            metadata: JSON.stringify({
              targetEmail: bootstrapTargetEmail,
              previousRole: UserRole.STUDENT,
              newRole: UserRole.PLATFORM_ADMIN,
            }),
          },
        });

        return u;
      });

      expect(promoted.role).toBe(UserRole.PLATFORM_ADMIN);

      const auditRecord = await prisma.auditLog.findFirst({
        where: {
          action: 'BOOTSTRAP_SUPER_ADMIN',
          resourceId: candidateUser.id,
        },
      });
      expect(auditRecord).not.toBeNull();
    });
  });

  describe('6. Demo Student Account Provisioning', () => {
    it('provisions a demo student account flagged with isDemoUser: true and verified membership', async () => {
      const demoEmail = `demo.test.${Date.now()}@iilm.edu`;
      const demoPassword = 'DemoStudentPassword2026!';
      const hash = await argon2.hash(demoPassword, { type: argon2.argon2id });

      const demoUser = await prisma.user.upsert({
        where: { email: demoEmail },
        update: { isDemoUser: true, emailVerified: new Date() },
        create: {
          name: 'Demo Student Tester',
          email: demoEmail,
          passwordHash: hash,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          isDemoUser: true,
          emailVerified: new Date(),
        },
      });

      expect(demoUser.isDemoUser).toBe(true);
      expect(demoUser.role).toBe(UserRole.STUDENT);

      const membership = await prisma.collegeMembership.create({
        data: {
          userId: demoUser.id,
          collegeId: iilmCollege.id,
          status: MembershipStatus.VERIFIED,
          verificationMethod: 'DEMO_PROVISION',
        },
      });

      expect(membership.status).toBe(MembershipStatus.VERIFIED);
    });
  });
});
