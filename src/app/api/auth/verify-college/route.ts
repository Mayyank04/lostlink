import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { verifyEmailVerificationOTP } from '@/lib/auth/emailVerification';
import { getCurrentUser } from '@/lib/auth/session';
import { resolveCollegeFromEmail } from '@/lib/college/resolve-college';
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

    // 2. Authoritative Server-Side Institutional Domain Resolution
    const resolution = await resolveCollegeFromEmail(email);
    if (!resolution.success) {
      return NextResponse.json(
        { error: resolution.message, code: resolution.code },
        { status: 400 }
      );
    }
    const resolvedCollegeId = resolution.collegeId;

    // Reject mismatched client-supplied collegeId that contradicts email resolution
    if (collegeId && collegeId !== resolvedCollegeId) {
      return NextResponse.json(
        {
          error: `Institutional mismatch: Email domain belongs to ${resolution.collegeName}. You cannot verify access to a different institution.`,
        },
        { status: 400 }
      );
    }

    // 3. Retrieve the target user from the database
    const targetUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
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

    // 4. Active session conflict check: caller must match email or be PLATFORM_ADMIN
    const sessionUser = await getCurrentUser(req);
    if (sessionUser && sessionUser.email.toLowerCase() !== email.toLowerCase() && sessionUser.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        {
          error: `Active session conflict: You are authenticated as ${sessionUser.email}. You are not authorized to verify an email address belonging to another user. Please sign out before verifying ${email}.`,
        },
        { status: 403 }
      );
    }

    // 5. Locate or prepare membership for resolvedCollegeId
    let membership = targetUser.memberships.find((m) => m.collegeId === resolvedCollegeId);
    if (!membership && targetUser.memberships.length > 0) {
      membership = targetUser.memberships[0];
    }

    // If membership is already verified, return idempotent success
    if (membership && membership.status === MembershipStatus.VERIFIED && targetUser.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Institutional membership is already active and verified.',
        college: {
          id: resolution.collegeId,
          name: resolution.collegeName,
          slug: resolution.slug,
        },
      });
    }

    // 6. Re-check the resolved college status and approved domain list
    const college = await prisma.college.findUnique({ where: { id: resolvedCollegeId } });
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

    // 7. Verify the cryptographic OTP bound to this email and resolved college
    const otpResult = await verifyEmailVerificationOTP(email, otpCode, resolvedCollegeId);
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

      if (membership) {
        await tx.collegeMembership.update({
          where: { id: membership.id },
          data: {
            collegeId: resolvedCollegeId,
            status: MembershipStatus.VERIFIED,
            verifiedAt: new Date(),
            verificationMethod: 'EMAIL_OTP',
            verifiedBy: 'SYSTEM_OTP_VERIFICATION',
          },
        });
      } else {
        await tx.collegeMembership.create({
          data: {
            userId: targetUser.id,
            collegeId: resolvedCollegeId,
            status: MembershipStatus.VERIFIED,
            verifiedAt: new Date(),
            verificationMethod: 'EMAIL_OTP',
            verifiedBy: 'SYSTEM_OTP_VERIFICATION',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: targetUser.id,
          collegeId: resolvedCollegeId,
          action: 'MEMBERSHIP_VERIFIED',
          resourceType: 'COLLEGE_MEMBERSHIP',
          resourceId: membership?.id || targetUser.id,
          metadata: JSON.stringify({
            email,
            collegeId: resolvedCollegeId,
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
      college: {
        id: college.id,
        name: college.name,
        slug: college.slug,
      },
    });
  } catch (error) {
    console.error('Verify college error:', error);
    return NextResponse.json(
      { error: 'Failed to complete college verification.' },
      { status: 500 }
    );
  }
}
