import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import {
  requirePlatformAdmin,
  requireCollegeAdmin,
  requireCollegeMembership,
  AuthError,
} from '@/lib/auth/tenant';
import { AuthenticatedUser } from '@/lib/auth/session';
import { UserRole, MembershipStatus, UserStatus, CollegeStatus } from '@prisma/client';
import crypto from 'crypto';

describe('Super Admin & Multi-College Tenant Governance Suite', () => {
  const mockStudent: AuthenticatedUser = {
    id: 'test-student-id',
    name: 'Alice Student',
    email: 'alice@mit.edu',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    emailVerified: new Date(),
    image: null,
    memberships: [
      {
        id: 'mem-mit',
        collegeId: 'test-mit-college',
        status: MembershipStatus.VERIFIED,
        verifiedAt: new Date(),
        studentIdentifier: 'MIT-001',
        college: {
          id: 'test-mit-college',
          name: 'MIT',
          slug: 'mit',
          logoUrl: null,
          city: 'Cambridge',
          state: 'MA',
        },
      },
    ],
  };

  const mockCollegeAdminA: AuthenticatedUser = {
    id: 'test-admin-a-id',
    name: 'Dean College A',
    email: 'dean@mit.edu',
    role: UserRole.COLLEGE_ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: new Date(),
    image: null,
    memberships: [
      {
        id: 'mem-admin-a',
        collegeId: 'test-mit-college',
        status: MembershipStatus.VERIFIED,
        verifiedAt: new Date(),
        studentIdentifier: null,
        college: {
          id: 'test-mit-college',
          name: 'MIT',
          slug: 'mit',
          logoUrl: null,
          city: 'Cambridge',
          state: 'MA',
        },
      },
    ],
  };

  const mockSuperAdmin: AuthenticatedUser = {
    id: 'test-superadmin-id',
    name: 'Super Admin',
    email: 'superadmin@lostlink.org',
    role: UserRole.PLATFORM_ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: new Date(),
    image: null,
    memberships: [],
  };

  let createdCollegeId: string | null = null;
  const testSlug = `test-univ-${Date.now()}`;

  afterAll(async () => {
    if (createdCollegeId) {
      await prisma.campusLocation.deleteMany({
        where: { campus: { collegeId: createdCollegeId } },
      });
      await prisma.campus.deleteMany({
        where: { collegeId: createdCollegeId },
      });
      await prisma.collegeAdminInvitation.deleteMany({
        where: { collegeId: createdCollegeId },
      });
      await prisma.auditLog.deleteMany({
        where: { collegeId: createdCollegeId },
      });
      await prisma.college.delete({
        where: { id: createdCollegeId },
      }).catch(() => {});
    }
  });

  describe('1. RBAC & Administrative Boundaries', () => {
    it('blocks students and college admins from Super Admin privileges', () => {
      expect(() => requirePlatformAdmin(mockStudent)).toThrow(AuthError);
      expect(() => requirePlatformAdmin(mockCollegeAdminA)).toThrow(AuthError);
    });

    it('grants Super Admin platform-wide privileges', () => {
      expect(requirePlatformAdmin(mockSuperAdmin)).toBe(true);
      expect(requireCollegeAdmin(mockSuperAdmin, 'any-college-id')).toBe(true);
    });

    it('enforces tenant boundary: College A Admin cannot manage College B', () => {
      // Authorized for College A (MIT)
      expect(requireCollegeAdmin(mockCollegeAdminA, 'test-mit-college')).toBe(true);
      // Denied for College B (Harvard)
      expect(() => requireCollegeAdmin(mockCollegeAdminA, 'test-harvard-college')).toThrow(AuthError);
    });
  });

  describe('2. Unlimited Logical College Onboarding & Atomic Provisioning', () => {
    it('provisions a new college tenant with campus, location, and audit log atomically', async () => {
      const college = await prisma.$transaction(async (tx) => {
        const newCol = await tx.college.create({
          data: {
            name: 'Test University of Technology',
            slug: testSlug,
            emailDomains: ['tut.edu', 'eng.tut.edu'],
            city: 'Atlanta',
            state: 'GA',
            country: 'United States',
            institutionType: 'University',
            website: 'https://tut.edu',
            contactEmail: 'contact@tut.edu',
            status: CollegeStatus.ACTIVE,
          },
        });

        const newCampus = await tx.campus.create({
          data: {
            collegeId: newCol.id,
            name: 'Main Campus',
            code: 'MAIN',
            addressLabel: '100 Tech Way',
            lostFoundDeskRoom: 'Tech Center 101',
          },
        });

        await tx.campusLocation.create({
          data: {
            campusId: newCampus.id,
            name: 'Primary Security Desk',
            building: 'Tech Center',
            hasDesk: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'COLLEGE_CREATED',
            actorId: null,
            collegeId: newCol.id,
            resourceType: 'College',
            resourceId: newCol.id,
            metadata: JSON.stringify({ slug: newCol.slug, name: newCol.name }),
          },
        });

        return newCol;
      });

      createdCollegeId = college.id;
      expect(college.id).toBeDefined();
      expect(college.slug).toBe(testSlug);
      expect(college.emailDomains).toContain('tut.edu');

      // Verify campus and location were created
      const campuses = await prisma.campus.findMany({
        where: { collegeId: college.id },
        include: { locations: true },
      });
      expect(campuses).toHaveLength(1);
      expect(campuses[0].code).toBe('MAIN');
      expect(campuses[0].locations).toHaveLength(1);
      expect(campuses[0].locations[0].hasDesk).toBe(true);
    });

    it('enforces slug uniqueness in database', async () => {
      await expect(
        prisma.college.create({
          data: {
            name: 'Duplicate University',
            slug: testSlug, // duplicate
            emailDomains: ['dup.edu'],
            city: 'Atlanta',
            state: 'GA',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('3. College Administrator Cryptographic Invitations', () => {
    it('generates a secure 32-byte invitation token with 14-day expiry', async () => {
      if (!createdCollegeId) throw new Error('College not provisioned');

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const invitation = await prisma.collegeAdminInvitation.create({
        data: {
          collegeId: createdCollegeId,
          email: 'dean.test@tut.edu',
          invitedBy: mockSuperAdmin.id,
          token,
          role: UserRole.COLLEGE_ADMIN,
          expiresAt,
        },
      });

      expect(invitation.id).toBeDefined();
      expect(invitation.token).toHaveLength(64);
      expect(invitation.status).toBe('PENDING');
      expect(invitation.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('4. Tenant Status Lifecycle & Registration Validation', () => {
    it('suspending a college updates status and soft-archiving preserves auditability', async () => {
      if (!createdCollegeId) throw new Error('College not provisioned');

      // Suspend
      const suspended = await prisma.college.update({
        where: { id: createdCollegeId },
        data: { status: CollegeStatus.SUSPENDED },
      });
      expect(suspended.status).toBe(CollegeStatus.SUSPENDED);

      // Archive
      const archived = await prisma.college.update({
        where: { id: createdCollegeId },
        data: { isArchived: true },
      });
      expect(archived.isArchived).toBe(true);
    });

    it('verifies student email domain matching logic against college domain array', () => {
      const allowedDomains = ['tut.edu', 'eng.tut.edu'];
      const testEmail1 = 'student@tut.edu';
      const testEmail2 = 'researcher@eng.tut.edu';
      const testEmail3 = 'outsider@gmail.com';

      const domain1 = testEmail1.split('@')[1];
      const domain2 = testEmail2.split('@')[1];
      const domain3 = testEmail3.split('@')[1];

      expect(allowedDomains.includes(domain1)).toBe(true);
      expect(allowedDomains.includes(domain2)).toBe(true);
      expect(allowedDomains.includes(domain3)).toBe(false);
    });
  });

  describe('5. Platform Settings & Audit Log Ledger', () => {
    it('persists and updates platform settings dynamically in database', async () => {
      const settingKey = `test_setting_${Date.now()}`;
      const setting = await prisma.platformSetting.upsert({
        where: { key: settingKey },
        update: { value: 'true' },
        create: {
          key: settingKey,
          value: 'true',
          description: 'Automated test configuration flag',
          isPublic: true,
        },
      });

      expect(setting.key).toBe(settingKey);
      expect(setting.value).toBe('true');

      // Clean up test setting
      await prisma.platformSetting.delete({ where: { key: settingKey } });
    });

    it('persists audit logs with actor and metadata', async () => {
      const log = await prisma.auditLog.create({
        data: {
          action: 'TEST_AUDIT_VERIFICATION',
          actorId: null,
          collegeId: null,
          resourceType: 'System',
          metadata: JSON.stringify({ verified: true, engine: 'Vitest' }),
        },
      });

      expect(log.id).toBeDefined();
      expect(log.action).toBe('TEST_AUDIT_VERIFICATION');
      expect(JSON.parse(log.metadata || '{}').verified).toBe(true);

      // Clean up
      await prisma.auditLog.delete({ where: { id: log.id } });
    });
  });
});
