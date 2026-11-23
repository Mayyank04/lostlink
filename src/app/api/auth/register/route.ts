import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { createEmailVerificationOTP } from '@/lib/auth/emailVerification';
import { MembershipStatus, UserRole } from '@prisma/client';

const PUBLIC_EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'aol.com',
  'zoho.com',
  'gmx.com',
  'yandex.com',
]);

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid institutional email required').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  collegeId: z.string().min(1, 'College selection is required'),
  studentId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`register:${ip}`, 5, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again shortly.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { name, email, password, collegeId, studentId } = result.data;
    const emailDomain = email.split('@')[1]?.toLowerCase().trim();

    if (!emailDomain || PUBLIC_EMAIL_PROVIDERS.has(emailDomain)) {
      return NextResponse.json(
        {
          error:
            'Personal email addresses (e.g. Gmail, Yahoo, Outlook) are not permitted. Please register using your official university-issued email.',
        },
        { status: 400 }
      );
    }

    const college = await prisma.college.findUnique({
      where: { id: collegeId },
    });

    if (!college) {
      return NextResponse.json(
        { error: 'Selected institution does not exist' },
        { status: 404 }
      );
    }

    if (college.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Selected institution is currently suspended or inactive' },
        { status: 400 }
      );
    }

    if (college.domainVerificationStatus !== 'VERIFIED') {
      return NextResponse.json(
        {
          error:
            'The domain for this institution is pending official verification. Student registration is not permitted until institutional verification is complete.',
        },
        { status: 400 }
      );
    }

    const isDomainAllowed = college.emailDomains.some(
      (d) => d.toLowerCase().trim() === emailDomain
    );

    if (!isDomainAllowed) {
      return NextResponse.json(
        {
          error: `Email domain "@${emailDomain}" is not authorized for ${college.name}. Allowed institutional domain(s): ${college.emailDomains.map((d) => '@' + d).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Strict Verification: Membership begins as PENDING, activated only upon OTP verification
    const membershipStatus = MembershipStatus.PENDING;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: UserRole.STUDENT,
          status: 'ACTIVE',
        },
      });

      await tx.collegeMembership.create({
        data: {
          userId: user.id,
          collegeId: college.id,
          status: membershipStatus,
          studentIdentifier: studentId || null,
          verificationMethod: 'EMAIL_OTP',
          verifiedAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: college.id,
          action: 'USER_REGISTERED',
          resourceType: 'USER',
          resourceId: user.id,
          metadata: JSON.stringify({ emailDomain, membershipStatus: 'PENDING' }),
        },
      });

      return user;
    });

    // Automatically generate and dispatch secure email verification OTP
    await createEmailVerificationOTP(newUser.email);

    const { token, expiresAt } = await createSession(newUser.id);
    await setSessionCookie(token, expiresAt);

    return NextResponse.json(
      {
        message: 'Account created successfully. Verification OTP dispatched to your institutional email.',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          collegeId: college.id,
          collegeName: college.name,
          membershipStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration' },
      { status: 500 }
    );
  }
}
