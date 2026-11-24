import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { resolveCollegeFromEmail } from '@/lib/college/resolve-college';
import { createEmailVerificationOTP } from '@/lib/auth/emailVerification';

export const dynamic = 'force-dynamic';

const sendOtpSchema = z.object({
  email: z.string().email('Valid institutional email required').toLowerCase().trim(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    // Rate limit: max 5 requests per 10 minutes per IP
    const rate = checkRateLimit(`send-reg-otp:${ip}`, 5, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = sendOtpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Valid email is required' },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // 1. Authoritative Server-Side Institutional Domain Resolution
    const resolution = await resolveCollegeFromEmail(email);
    if (!resolution.success) {
      return NextResponse.json(
        { error: resolution.message, code: resolution.code },
        { status: 400 }
      );
    }

    // 2. Check if an account already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this institutional email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    // 3. Dispatch OTP bound to email and college ID
    await createEmailVerificationOTP(email, resolution.collegeId);

    return NextResponse.json({
      success: true,
      message: `A secure 6-digit verification code has been dispatched to ${email}.`,
      college: {
        id: resolution.collegeId,
        name: resolution.collegeName,
        shortName: resolution.shortName,
        slug: resolution.slug,
        domain: resolution.domain,
      },
    });
  } catch (error) {
    console.error('Error dispatching registration OTP:', error);
    return NextResponse.json(
      { error: 'Failed to dispatch verification code. Please check your institutional email.' },
      { status: 500 }
    );
  }
}
