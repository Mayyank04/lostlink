import { describe, it, expect } from 'vitest';
import {
  requireCollegeMembership,
  requireCollegeAdmin,
  requirePlatformAdmin,
  hasCollegeMembership,
  AuthError,
} from '@/lib/auth/tenant';
import { UserRole, MembershipStatus, UserStatus } from '@prisma/client';
import { AuthenticatedUser } from '@/lib/auth/session';

describe('Multi-Tenant Cross-College Authorization', () => {
  const studentUser: AuthenticatedUser = {
    id: 'user-apex-student',
    name: 'Maya Lin',
    email: 'maya.lin@apex.edu',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    emailVerified: new Date(),
    image: null,
    memberships: [
      {
        id: 'mem-1',
        collegeId: 'college-apex',
        status: MembershipStatus.VERIFIED,
        verifiedAt: new Date(),
        studentIdentifier: 'APEX-8912',
        college: {
          id: 'college-apex',
          name: 'Apex University',
          slug: 'apex',
          logoUrl: null,
          city: 'Cambridge',
          state: 'MA',
        },
      },
    ],
  };

  const collegeAdminUser: AuthenticatedUser = {
    id: 'user-apex-admin',
    name: 'Dr. Sarah Jenkins',
    email: 'admin@apex.edu',
    role: UserRole.COLLEGE_ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: new Date(),
    image: null,
    memberships: [
      {
        id: 'mem-2',
        collegeId: 'college-apex',
        status: MembershipStatus.VERIFIED,
        verifiedAt: new Date(),
        studentIdentifier: null,
        college: {
          id: 'college-apex',
          name: 'Apex University',
          slug: 'apex',
          logoUrl: null,
          city: 'Cambridge',
          state: 'MA',
        },
      },
    ],
  };

  const platformAdminUser: AuthenticatedUser = {
    id: 'user-platform-superadmin',
    name: 'Super Admin',
    email: 'ops@lostlink.org',
    role: UserRole.PLATFORM_ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: new Date(),
    image: null,
    memberships: [],
  };

  it('allows verified student within their own college', () => {
    expect(hasCollegeMembership(studentUser, 'college-apex')).toBe(true);
    const membership = requireCollegeMembership(studentUser, 'college-apex');
    expect(membership.collegeId).toBe('college-apex');
  });

  it('rejects cross-college operations for unverified or non-member colleges', () => {
    expect(hasCollegeMembership(studentUser, 'college-horizon')).toBe(false);
    expect(() => requireCollegeMembership(studentUser, 'college-horizon')).toThrow(AuthError);
  });

  it('allows platform admin global access across all colleges', () => {
    expect(hasCollegeMembership(platformAdminUser, 'college-horizon')).toBe(true);
    const mem = requireCollegeMembership(platformAdminUser, 'college-horizon');
    expect(mem.collegeId).toBe('college-horizon');
    expect(requirePlatformAdmin(platformAdminUser)).toBe(true);
  });

  it('enforces college admin boundaries', () => {
    expect(requireCollegeAdmin(collegeAdminUser, 'college-apex')).toBe(true);
    expect(() => requireCollegeAdmin(studentUser, 'college-apex')).toThrow(AuthError);
    expect(() => requirePlatformAdmin(collegeAdminUser)).toThrow(AuthError);
  });
});

