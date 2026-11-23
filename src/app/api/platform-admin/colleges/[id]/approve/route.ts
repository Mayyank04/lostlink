import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { CollegeStatus } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);
    const { id } = await Promise.resolve(params);

    const college = await prisma.college.findUnique({
      where: { id },
    });
    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const col = await tx.college.update({
        where: { id },
        data: {
          status: CollegeStatus.ACTIVE,
          domainVerificationStatus: 'VERIFIED',
          isArchived: false,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: col.id,
          action: 'APPROVE_COLLEGE',
          resourceType: 'COLLEGE',
          resourceId: col.id,
          metadata: JSON.stringify({ approvedBy: user.email, timestamp: new Date().toISOString() }),
        },
      });

      return col;
    });

    return NextResponse.json({ message: `College "${updated.name}" approved successfully`, college: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

