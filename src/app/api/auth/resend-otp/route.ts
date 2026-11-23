import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { createEmailVerificationOTP } from '@/lib/auth/emailVerification';

const RESEND_COOLDOWN_MS = 60 * 1000; // 60-second cooldown between resends

const resendSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  collegeId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json();
    const result = resendSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const { email, collegeId } = result.data;

    // Rate limit: max 3 resends per 5 minutes per IP + email
    const rate = checkRateLimit(`resend-otp:${ip}:${email}`, 3, 5 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many verification code requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    // Enforce 60-second resend cooldown on active challenge
    const recentToken = await prisma.verificationToken.findFirst({
      where: { identifier: email },
      orderBy: { createdAt: 'desc' },
    });

    if (recentToken) {
      const timeSinceCreation = Date.now() - recentToken.createdAt.getTime();
      if (timeSinceCreation < RESEND_COOLDOWN_MS) {
        const secondsRemaining = Math.ceil((RESEND_COOLDOWN_MS - timeSinceCreation) / 1000);
        return NextResponse.json(
          { error: `Please wait ${secondsRemaining} second(s) before requesting another verification code.` },
          { status: 429 }
        );
      }
    }

    // Verify user exists and is not yet verified
    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    if (!user) {
      // Do not reveal email existence to prevent user enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a fresh verification code has been dispatched.',
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'This account email is already verified. You may proceed to sign in.',
      });
    }

    const effectiveCollegeId = collegeId || user.memberships[0]?.collegeId;

    // Invalidate previous challenges and issue fresh bound OTP
    await createEmailVerificationOTP(email, effectiveCollegeId, user.id);

    return NextResponse.json({
      success: true,
      message: 'A fresh 6-digit verification code has been sent to your institutional email.',
    });
  } catch (error) {
    console.error('Error resending verification OTP:', error);
    return NextResponse.json({ error: 'Failed to dispatch verification code' }, { status: 500 });
  }
}
