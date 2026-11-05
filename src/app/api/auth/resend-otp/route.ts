import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { createEmailVerificationOTP } from '@/lib/auth/emailVerification';

const resendSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json();
    const result = resendSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const { email } = result.data;

    // Rate limit: max 3 resends per 5 minutes per IP + email
    const rate = checkRateLimit(`resend-otp:${ip}:${email}`, 3, 5 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many verification code requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    // Verify user exists and is not yet verified
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Do not reveal email existence to prevent enumeration
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

    await createEmailVerificationOTP(email);

    return NextResponse.json({
      success: true,
      message: 'A fresh 6-digit verification code has been sent to your institutional email.',
    });
  } catch (error) {
    console.error('Error resending verification OTP:', error);
    return NextResponse.json({ error: 'Failed to dispatch verification code' }, { status: 500 });
  }
}
