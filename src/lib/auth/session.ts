import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { UserRole, MembershipStatus, UserStatus } from '@prisma/client';

const SESSION_COOKIE_NAME = 'lostlink_session';
const SESSION_DURATION_DAYS = 7;
const SESSION_DURATION_SECONDS = SESSION_DURATION_DAYS * 24 * 60 * 60;

function getSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.trim().length < 32 || secret.includes('dev_secret') || secret.includes('generate_a_random')) {
      throw new Error(
        'CRITICAL SECURITY CONFIGURATION ERROR: AUTH_SECRET or SESSION_SECRET must be configured with a random string of at least 32 characters in production environments.'
      );
    }
  }

  const effectiveSecret = secret || 'dev_secret_lostlink_session_key_32_bytes_min_12345';
  return new TextEncoder().encode(effectiveSecret.padEnd(32, '!'));
}

export interface SessionPayload {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: Date | null;
  image: string | null;
  memberships: {
    id: string;
    collegeId: string;
    status: MembershipStatus;
    verifiedAt: Date | null;
    studentIdentifier: string | null;
    college: {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      city: string | null;
      state: string | null;
    };
  }[];
}

/**
 * Creates a database session and returns the signed JWT token
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const secret = getSecretKey();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  const dbSession = await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expiresAt,
    },
    include: {
      user: true,
    },
  });

  const token = await new SignJWT({
    sessionId: dbSession.id,
    sessionToken: dbSession.sessionToken,
    userId: dbSession.userId,
    email: dbSession.user.email,
    role: dbSession.user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(secret);

  return { token, expiresAt };
}

/**
 * Sets the session cookie on Next.js Response / cookie store
 */
export async function setSessionCookie(token: string, expiresAt: Date) {
  try {
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
      maxAge: SESSION_DURATION_SECONDS,
    });
  } catch (error) {
    console.warn('Failed to set cookie in current context:', error);
  }
}

/**
 * Clears the session cookie
 */
export async function clearSessionCookie() {
  try {
    const cookieStore = cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    console.warn('Failed to delete cookie in current context:', error);
  }
}

/**
 * Extracts session token from Cookie header or cookies() store
 */
export async function extractTokenFromRequest(req?: Request): Promise<string | null> {
  if (req) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
      if (match) return match[2];
    }
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }

  try {
    const cookieStore = cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    return cookie ? cookie.value : null;
  } catch {
    return null;
  }
}

/**
 * Resolves and validates the authenticated user from the active session
 */
export async function getCurrentUser(req?: Request): Promise<AuthenticatedUser | null> {
  const token = await extractTokenFromRequest(req);
  if (!token) return null;

  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    const sessionToken = (payload as any).sessionToken as string;

    if (!sessionToken) return null;

    // Verify session exists and is not expired
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                college: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    logoUrl: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return null;
    }

    if (session.user.status === 'SUSPENDED') {
      return null;
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
      emailVerified: session.user.emailVerified,
      image: session.user.image,
      memberships: session.user.memberships.map((m) => ({
        id: m.id,
        collegeId: m.collegeId,
        status: m.status,
        verifiedAt: m.verifiedAt,
        studentIdentifier: m.studentIdentifier,
        college: m.college,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Destroys session in database and clears the cookie
 */
export async function destroySession(req?: Request) {
  const token = await extractTokenFromRequest(req);
  if (token) {
    try {
      const secret = getSecretKey();
      const { payload } = await jwtVerify(token, secret);
      const sessionToken = (payload as any).sessionToken as string;
      if (sessionToken) {
        await prisma.session.delete({ where: { sessionToken } }).catch(() => {});
      }
    } catch {
      // Ignored
    }
  }
  await clearSessionCookie();
}
