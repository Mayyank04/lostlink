import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { POST as postOtpLogin } from '@/app/api/auth/login-otp/route';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().optional(),
  otp: z.string().optional(),
  otpCode: z.string().optional(),
  collegeId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`login:${ip}`, 10, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    // If OTP is provided, execute Student OTP login flow
    if (body?.otp || body?.otpCode) {
      const otpRequest = new Request(req.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: body.email,
          otp: body.otp || body.otpCode,
          collegeId: body.collegeId,
        }),
      });
      return postOtpLogin(otpRequest);
    }

    const result = loginSchema.safeParse(body);
    if (!result.success || !result.data.password) {
      return NextResponse.json(
        { error: result.success ? 'Password is required' : (result.error.issues[0]?.message || 'Invalid credentials') },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            college: true,
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact institutional support.' },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_LOGIN',
        resourceType: 'USER',
        resourceId: user.id,
        metadata: JSON.stringify({ ip }),
      },
    }).catch(() => {});

    let redirectTo = '/dashboard';
    if (user.role === 'PLATFORM_ADMIN') {
      redirectTo = '/platform-admin';
    } else if (user.role === 'COLLEGE_ADMIN' || user.role === 'COLLEGE_MODERATOR') {
      redirectTo = '/college-admin';
    } else {
      const verifiedMembership = user.memberships.find((m) => m.status === 'VERIFIED');
      if (!user.emailVerified || !verifiedMembership) {
        redirectTo = '/auth/verify-college';
      } else if (!user.isOnboarded) {
        redirectTo = '/onboarding/student';
      } else if (verifiedMembership?.college?.slug) {
        redirectTo = `/campus/${verifiedMembership.college.slug}/dashboard`;
      }
    }

    return NextResponse.json({
      message: 'Logged in successfully',
      redirectTo,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        emailVerified: user.emailVerified,
        isOnboarded: user.isOnboarded,
        collegeId: user.memberships[0]?.collegeId,
        memberships: user.memberships.map((m) => ({
          id: m.id,
          collegeId: m.collegeId,
          status: m.status,
          verifiedAt: m.verifiedAt,
          college: {
            id: m.college.id,
            name: m.college.name,
            slug: m.college.slug,
            logoUrl: m.college.logoUrl,
            city: m.college.city,
            state: m.college.state,
          },
        })),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login' },
      { status: 500 }
    );
  }
}
