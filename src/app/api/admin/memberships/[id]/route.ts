import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { MembershipStatus, UserRole } from '@prisma/client';

const updateMembershipSchema = z.object({
  status: z.enum(['VERIFIED', 'SUSPENDED', 'PENDING']),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const membership = await prisma.collegeMembership.findUnique({
      where: { id },
      include: { college: true },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    const isPlatformAdmin = user.role === UserRole.PLATFORM_ADMIN;
    const isCollegeAdmin = (user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR) &&
      user.memberships.some((m) => m.collegeId === membership.collegeId);

    if (!isPlatformAdmin && !isCollegeAdmin) {
      return NextResponse.json(
        { error: 'Administrative privileges required for this institution' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = updateMembershipSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid membership status' }, { status: 400 });
    }

    const newStatus = result.data.status as MembershipStatus;

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.collegeMembership.update({
        where: { id },
        data: {
          status: newStatus,
          verifiedAt: newStatus === MembershipStatus.VERIFIED ? new Date() : null,
          verifiedBy: user.name,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: membership.collegeId,
          action: 'UPDATE_MEMBERSHIP',
          resourceType: 'COLLEGE_MEMBERSHIP',
          resourceId: id,
          metadata: JSON.stringify({ newStatus, collegeId: membership.collegeId }),
        },
      });

      return m;
    });

    return NextResponse.json({
      message: 'Membership status updated successfully',
      membership: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
