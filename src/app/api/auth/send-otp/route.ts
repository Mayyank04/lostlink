import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { resolveCollegeFromEmail } from '@/lib/college/resolve-college';
import { createEmailVerificationOTP } from '@/lib/auth/emailVerification';
import { isSandboxModeEnabled, SANDBOX_OTP } from '@/lib/auth/sandbox';

export const dynamic = 'force-dynamic';

const sendOtpSchema = z.object({
  email: z.string().email('Valid institutional email required').toLowerCase().trim(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`send-otp:${ip}`, 10, 5 * 60 * 1000);
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
        { error: result.error.issues[0]?.message || 'Valid institutional email is required' },
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

    const sandbox = isSandboxModeEnabled();

    // 2. Dispatch OTP bound to email and college ID
    await createEmailVerificationOTP(email, resolution.collegeId);

    return NextResponse.json({
      success: true,
      sandboxMode: sandbox,
      sandboxOtp: sandbox ? SANDBOX_OTP : undefined,
      message: sandbox
        ? `SANDBOX MODE ACTIVE — Use test verification OTP: ${SANDBOX_OTP}`
        : `A secure 6-digit verification code has been dispatched to ${email}.`,
      college: {
        id: resolution.collegeId,
        name: resolution.collegeName,
        shortName: resolution.shortName,
        slug: resolution.slug,
        domain: resolution.domain,
        campusSlug: resolution.campusSlug,
        primaryColor: resolution.primaryColor,
        logoUrl: resolution.logoUrl,
      },
    });
  } catch (error) {
    console.error('Error dispatching OTP:', error);
    return NextResponse.json(
      { error: 'Failed to dispatch verification code. Please check your institutional email.' },
      { status: 500 }
    );
  }
}
