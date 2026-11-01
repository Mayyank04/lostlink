import { NextResponse } from 'next/server';
import { AuthenticatedUser, getCurrentUser } from './session';
import { UserRole, MembershipStatus } from '@prisma/client';

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AuthError';
  }
}

/**
 * Ensures a request is authenticated, otherwise throws AuthError(401)
 */
export async function requireAuth(req?: Request): Promise<AuthenticatedUser> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new AuthError('Authentication required. Please sign in.', 401);
  }
  return user;
}

/**
 * Checks if the user has a verified membership or is a platform admin
 */
export function hasCollegeMembership(user: AuthenticatedUser, collegeId: string): boolean {
  if (user.role === UserRole.PLATFORM_ADMIN) return true;
  return user.memberships.some(
    (m) => m.collegeId === collegeId && m.status === MembershipStatus.VERIFIED
  );
}

/**
 * Requires verified college membership to perform an action within a specific college
 */
export function requireCollegeMembership(
  user: AuthenticatedUser,
  collegeId: string
): NonNullable<AuthenticatedUser['memberships'][0]> {
  if (user.role === UserRole.PLATFORM_ADMIN) {
    return {
      id: 'platform-admin-membership',
      collegeId,
      status: MembershipStatus.VERIFIED,
      verifiedAt: new Date(),
      studentIdentifier: null,
      college: { id: collegeId, name: 'Admin Scope', slug: 'admin', logoUrl: null, city: 'Global', state: 'Global' },
    };
  }

  const membership = user.memberships.find(
    (m) => m.collegeId === collegeId && m.status === MembershipStatus.VERIFIED
  );

  if (!membership) {
    throw new AuthError('Active college verification required to access this resource.', 403);
  }

  return membership;
}

/**
 * Requires administrative or moderator privileges for a specific college
 */
export function requireCollegeAdmin(
  user: AuthenticatedUser,
  collegeId?: string
): boolean {
  if (user.role === UserRole.PLATFORM_ADMIN) return true;

  if (user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR) {
    if (!collegeId) return true;
    const isMember = user.memberships.some(
      (m) => m.collegeId === collegeId && m.status === MembershipStatus.VERIFIED
    );
    if (isMember) return true;
  }

  throw new AuthError('College administrative privileges required.', 403);
}

/**
 * Requires Platform Administrator role
 */
export function requirePlatformAdmin(user: AuthenticatedUser): boolean {
  if (user.role !== UserRole.PLATFORM_ADMIN) {
    throw new AuthError('Platform administrator privileges required.', 403);
  }
  return true;
}

/**
 * Helper to produce standard error responses in API handlers
 */
export function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  console.error('Unhandled server error:', error);
  const message = error instanceof Error ? error.message : 'Internal server error';
  return NextResponse.json({ error: message }, { status: 500 });
}
