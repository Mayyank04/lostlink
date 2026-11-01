import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MembershipStatus } from '@prisma/client';

const verifySchema = z.object({
  email: z.string().email().toLowerCase(),
  collegeId: z.string().min(1),
  otpCode: z.string().min(4),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = verifySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Valid email and verification code are required' },
        { status: 400 }
      );
    }

    const { email, collegeId } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { collegeId },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });

      if (user.memberships.length > 0) {
        await tx.collegeMembership.update({
          where: { id: user.memberships[0].id },
          data: {
            status: MembershipStatus.VERIFIED,
            verifiedAt: new Date(),
          },
        });
      } else {
        await tx.collegeMembership.create({
          data: {
            userId: user.id,
            collegeId,
            status: MembershipStatus.VERIFIED,
            verifiedAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId,
          action: 'MEMBERSHIP_VERIFIED',
          resourceType: 'COLLEGE_MEMBERSHIP',
          resourceId: collegeId,
          metadata: JSON.stringify({ email, collegeId }),
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
