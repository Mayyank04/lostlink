import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { verifyEmailVerificationOTP } from '@/lib/auth/emailVerification';
import { getCurrentUser } from '@/lib/auth/session';
import { MembershipStatus } from '@prisma/client';

const verifySchema = z
  .object({
    email: z.string().email().toLowerCase().trim(),
    collegeId: z.string().optional(),
    otpCode: z.string().min(6, 'Verification code must be 6 digits').max(10).optional(),
    otp: z.string().min(6, 'Verification code must be 6 digits').max(10).optional(),
  })
  .refine((data) => Boolean(data.otpCode || data.otp), {
    message: 'Verification code must be 6 digits',
    path: ['otpCode'],
  });

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json();
    const result = verifySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Valid email and 6-digit verification code are required' },
        { status: 400 }
      );
    }

    const { email, collegeId } = result.data;
    const otpCode = (result.data.otpCode || result.data.otp) as string;

    // 1. Rate limiting: max 5 verification attempts per 15 minutes per IP + email
    const rate = checkRateLimit(`verify-college:${ip}:${email}`, 5, 15 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    // 2. Retrieve the original pending registration from the database
    const targetUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: collegeId ? { collegeId } : undefined,
          include: { college: true },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User account or pending registration not found.' },
        { status: 404 }
      );
    }

    // 3. Verify that the user has an existing membership challenge for the requested college
    const membership = targetUser.memberships[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'No pending registration found for the specified institution.' },
        { status: 400 }
      );
    }

    // 4. Authorization check: if session exists, caller must be target user or platform admin
    const sessionUser = await getCurrentUser(req);
    if (sessionUser && sessionUser.email !== email && sessionUser.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'You are not authorized to verify an email address belonging to another user.' },
        { status: 403 }
      );
    }

    // If membership is already verified, return idempotent success
    if (membership.status === MembershipStatus.VERIFIED && targetUser.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Institutional membership is already active and verified.',
      });
    }

    // 5. Re-check the college status and approved domain list
    const college = membership.college;
    if (!college || college.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'The selected institution is currently inactive or suspended. Verification cannot proceed.' },
        { status: 400 }
      );
    }

    if (college.domainVerificationStatus !== 'VERIFIED') {
      return NextResponse.json(
        {
          error:
            'The domain for this institution is pending official verification. Student activation is not permitted.',
        },
        { status: 400 }
      );
    }

    // 6. Re-check email domain against college approved domain allowlist (case-insensitive, exact match)
    const emailDomain = email.split('@')[1]?.toLowerCase().trim();
    const isDomainAllowed = college.emailDomains.some((d) => d.toLowerCase().trim() === emailDomain);
    if (!isDomainAllowed) {
      return NextResponse.json(
        {
          error: `Email domain "@${emailDomain}" is not permitted for ${college.name}. Allowed domain(s): ${college.emailDomains.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 7. Verify the cryptographic OTP bound to this email and college
    const otpResult = await verifyEmailVerificationOTP(email, otpCode, collegeId);
    if (!otpResult.success) {
      return NextResponse.json(
        { error: otpResult.error || 'Invalid or expired verification code.' },
        { status: 400 }
      );
    }

    // 8. Atomically activate membership, mark user as emailVerified, and record immutable audit event
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUser.id },
        data: { emailVerified: new Date() },
      });

      await tx.collegeMembership.update({
        where: { id: membership.id },
        data: {
          status: MembershipStatus.VERIFIED,
          verifiedAt: new Date(),
          verificationMethod: 'EMAIL_OTP',
          verifiedBy: 'SYSTEM_OTP_VERIFICATION',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: targetUser.id,
          collegeId: college.id,
          action: 'MEMBERSHIP_VERIFIED',
          resourceType: 'COLLEGE_MEMBERSHIP',
          resourceId: membership.id,
          metadata: JSON.stringify({
            email,
            collegeId: college.id,
            collegeName: college.name,
            method: 'EMAIL_OTP',
            timestamp: new Date().toISOString(),
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'College membership successfully verified. Institutional access granted.',
    });
  } catch (error) {
    console.error('Verify college error:', error);
    return NextResponse.json(
      { error: 'Failed to complete college verification.' },
      { status: 500 }
    );
  }
}
