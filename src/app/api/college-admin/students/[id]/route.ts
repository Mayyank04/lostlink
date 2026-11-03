import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireCollegeAdmin, errorResponse, AuthError } from '@/lib/auth/tenant';
import { MembershipStatus } from '@prisma/client';
import { z } from 'zod';

const updateMembershipSchema = z.object({
  status: z.enum([MembershipStatus.VERIFIED, MembershipStatus.REJECTED, MembershipStatus.SUSPENDED]),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id: membershipId } = await params;

    const membership = await prisma.collegeMembership.findUnique({
      where: { id: membershipId },
      include: {
        college: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'College membership record not found' }, { status: 404 });
    }

    requireCollegeAdmin(user, membership.collegeId);

    const body = await req.json();
    const parsed = updateMembershipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid membership update data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { status, notes } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.collegeMembership.update({
        where: { id: membershipId },
        data: {
          status,
          verifiedAt: status === MembershipStatus.VERIFIED ? new Date() : null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'MEMBERSHIP_STATUS_CHANGED',
          actorId: user.id,
          collegeId: membership.collegeId,
          resourceType: 'CollegeMembership',
          resourceId: membershipId,
          metadata: JSON.stringify({
            previousStatus: membership.status,
            newStatus: status,
            targetUserId: membership.userId,
            targetUserName: membership.user.name,
            notes,
          }),
        },
      });

      return result;
    });

    return NextResponse.json({
      success: true,
      message: `Membership status updated to ${status}`,
      membership: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
