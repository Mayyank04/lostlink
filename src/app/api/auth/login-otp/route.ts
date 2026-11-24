import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { resolveCollegeFromEmail } from '@/lib/college/resolve-college';
import { verifyEmailVerificationOTP } from '@/lib/auth/emailVerification';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { UserRole, MembershipStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const loginOtpSchema = z.object({
  email: z.string().email('Valid institutional email required').toLowerCase().trim(),
  otp: z.string().min(6, 'Verification code must be 6 digits').max(10).trim(),
  collegeId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`login-otp:${ip}`, 10, 5 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = loginOtpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Valid email and 6-digit OTP code required' },
        { status: 400 }
      );
    }

    const { email, otp, collegeId } = result.data;

    // 1. Authoritative Server-Side Institutional Domain Resolution
    const resolution = await resolveCollegeFromEmail(email);
    if (!resolution.success) {
      return NextResponse.json(
        { error: resolution.message, code: resolution.code },
        { status: 400 }
      );
    }

    const targetCollegeId = resolution.collegeId;
    if (collegeId && collegeId !== targetCollegeId) {
      return NextResponse.json(
        {
          error: `Email domain "@${resolution.domain}" is assigned to ${resolution.collegeName}. You cannot manually select or assign a different college.`,
        },
        { status: 400 }
      );
    }

    // 2. Validate OTP (supports permitted sandbox OTP 123456 or real cryptographic token)
    const otpResult = await verifyEmailVerificationOTP(email, otp, targetCollegeId);
    if (!otpResult.success) {
      return NextResponse.json(
        { error: otpResult.error || 'Invalid or expired verification code.' },
        { status: 400 }
      );
    }

    // 3. User Lookup & Admin Protection
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        memberships: {
          include: { college: true },
        },
      },
    });

    if (user) {
      if (user.status === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'Your account has been suspended. Please contact institutional support.' },
          { status: 403 }
        );
      }

      const isSandboxUsed = Boolean(otpResult.isSandbox || otpResult.tokenRecord?.isSandbox);
      // Security rule: Sandbox verification MUST NEVER grant administrator privileges
      if (
        isSandboxUsed &&
        (user.role === UserRole.PLATFORM_ADMIN ||
          user.role === UserRole.COLLEGE_ADMIN ||
          user.role === UserRole.COLLEGE_MODERATOR)
      ) {
        return NextResponse.json(
          {
            error:
              'Sandbox OTP verification cannot be used for administrative accounts. Please use the dedicated admin login portal.',
          },
          { status: 403 }
        );
      }

      // Update emailVerified timestamp and last login
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: user.emailVerified || new Date(),
          lastLoginAt: new Date(),
        },
        include: {
          studentProfile: true,
          memberships: {
            include: { college: true },
          },
        },
      });

      // Ensure verified membership exists for this college
      const hasMembership = user.memberships.some(
        (m) => m.collegeId === targetCollegeId && m.status === MembershipStatus.VERIFIED
      );

      if (!hasMembership) {
        const existingMembership = user.memberships.find((m) => m.collegeId === targetCollegeId);
        if (existingMembership) {
          await prisma.collegeMembership.update({
            where: { id: existingMembership.id },
            data: {
              status: MembershipStatus.VERIFIED,
              verifiedAt: new Date(),
            },
          });
        } else {
          await prisma.collegeMembership.create({
            data: {
              userId: user.id,
              collegeId: targetCollegeId,
              status: MembershipStatus.VERIFIED,
              verifiedAt: new Date(),
              verificationMethod: otpResult.isSandbox ? 'SANDBOX_OTP' : 'EMAIL_OTP',
            },
          });
        }
      }
    } else {
      // 4. Auto-register new student user on verified institutional OTP
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: email.split('@')[0],
            email,
            role: UserRole.STUDENT,
            status: 'ACTIVE',
            emailVerified: new Date(),
            isOnboarded: false,
          },
          include: {
            studentProfile: true,
            memberships: {
              include: { college: true },
            },
          },
        });

        await tx.collegeMembership.create({
          data: {
            userId: newUser.id,
            collegeId: targetCollegeId,
            status: MembershipStatus.VERIFIED,
            verifiedAt: new Date(),
            verificationMethod: otpResult.isSandbox ? 'SANDBOX_OTP' : 'EMAIL_OTP',
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: newUser.id,
            collegeId: targetCollegeId,
            action: 'STUDENT_REGISTERED_VIA_OTP',
            resourceType: 'USER',
            resourceId: newUser.id,
            metadata: JSON.stringify({
              emailDomain: resolution.domain,
              isSandbox: Boolean(otpResult.isSandbox),
            }),
          },
        });

        return newUser;
      });
    }

    // 5. Create Session & Set Cookie
    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);

    // 6. Determine Redirection
    let redirectTo = '/dashboard';
    if (!user.isOnboarded || !user.studentProfile?.isOnboardingDone) {
      redirectTo = '/onboarding/student';
    } else {
      redirectTo = '/dashboard';
    }

    const response = NextResponse.json({
      success: true,
      message: 'Signed in successfully. Welcome to LostLink!',
      redirectTo,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        emailVerified: user.emailVerified,
        isOnboarded: Boolean(user.isOnboarded || user.studentProfile?.isOnboardingDone),
        collegeId: targetCollegeId,
        collegeName: resolution.collegeName,
        collegeSlug: resolution.slug,
      },
    });

    response.cookies.set('lostlink_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Error during OTP login:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during verification' },
      { status: 500 }
    );
  }
}
