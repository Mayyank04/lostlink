import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { CollegeStatus } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const college = await prisma.college.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { items: true, memberships: true, claims: true },
        },
      },
    });

    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    // Safe soft-archive: preserve records, set isArchived = true and status = SUSPENDED
    const updated = await prisma.$transaction(async (tx) => {
      const col = await tx.college.update({
        where: { id: params.id },
        data: {
          isArchived: true,
          status: CollegeStatus.SUSPENDED,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: col.id,
          action: 'ARCHIVE_COLLEGE',
          resourceType: 'COLLEGE',
          resourceId: col.id,
          metadata: JSON.stringify({
            archivedBy: user.email,
            preservedItems: college._count.items,
            preservedMemberships: college._count.memberships,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return col;
    });

    return NextResponse.json({
      message: `College "${updated.name}" safely archived. Historical reports and claims remain preserved.`,
      college: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
