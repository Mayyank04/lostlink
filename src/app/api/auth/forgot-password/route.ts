import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';

const forgotSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`forgot:${ip}`, 5, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute before requesting another reset.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = forgotSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const { email } = result.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          email,
          token,
          expiresAt,
        },
      });

      console.log(`[AUTH] Password reset token for ${email}: ${token}`);
    }

    return NextResponse.json({
      message: 'If an account matches that email address, password reset instructions have been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
