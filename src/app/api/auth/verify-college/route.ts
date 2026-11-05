import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { verifyEmailVerificationOTP } from '@/lib/auth/emailVerification';
import { getCurrentUser } from '@/lib/auth/session';
import { MembershipStatus } from '@prisma/client';

const verifySchema = z.object({
  email: z.string().email().toLowerCase(),
  collegeId: z.string().min(1),
  otpCode: z.string().min(6, 'Verification code must be 6 digits').max(10),
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

    const { email, collegeId, otpCode } = result.data;

    // 1. Rate limiting: max 5 verification attempts per 15 minutes per IP + email
    const rate = checkRateLimit(`verify-college:${ip}:${email}`, 5, 15 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    // 2. Look up target user
    const targetUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { collegeId },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    // 3. Authorization check: if session exists, caller must be target user or platform admin
    const sessionUser = await getCurrentUser(req);
    if (sessionUser && sessionUser.email !== email && sessionUser.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'You are not authorized to verify an email address belonging to another user' },
        { status: 403 }
      );
    }

    // 4. Cryptographic OTP Verification
    const otpResult = await verifyEmailVerificationOTP(email, otpCode);
    if (!otpResult.success) {
      return NextResponse.json(
        { error: otpResult.error || 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // 5. Update emailVerified and College Membership in an atomic transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUser.id },
        data: { emailVerified: new Date() },
      });

      if (targetUser.memberships.length > 0) {
        await tx.collegeMembership.update({
          where: { id: targetUser.memberships[0].id },
          data: {
            status: MembershipStatus.VERIFIED,
            verifiedAt: new Date(),
            verificationMethod: 'EMAIL_OTP',
          },
        });
      } else {
        await tx.collegeMembership.create({
          data: {
            userId: targetUser.id,
            collegeId,
            status: MembershipStatus.VERIFIED,
            verifiedAt: new Date(),
            verificationMethod: 'EMAIL_OTP',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: targetUser.id,
          collegeId,
          action: 'MEMBERSHIP_VERIFIED',
          resourceType: 'COLLEGE_MEMBERSHIP',
          resourceId: collegeId,
          metadata: JSON.stringify({ email, collegeId, method: 'EMAIL_OTP' }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'College membership successfully verified',
    });
  } catch (error) {
    console.error('Verify college error:', error);
    return NextResponse.json(
      { error: 'Failed to verify college membership' },
      { status: 500 }
    );
  }
}
