import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { CollegeStatus } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    let reason = 'Application rejected by platform administration';
    try {
      const body = await req.json();
      if (body.reason) reason = body.reason.trim();
    } catch {
      // Body optional
    }

    const college = await prisma.college.findUnique({
      where: { id: params.id },
    });
    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const col = await tx.college.update({
        where: { id: params.id },
        data: {
          status: CollegeStatus.SUSPENDED,
          reviewNotes: reason,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: col.id,
          action: 'REJECT_COLLEGE',
          resourceType: 'COLLEGE',
          resourceId: col.id,
          metadata: JSON.stringify({ reason, rejectedBy: user.email, timestamp: new Date().toISOString() }),
        },
      });

      return col;
    });

    return NextResponse.json({ message: `College "${updated.name}" rejected`, college: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

