import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);

    const isPlatformAdmin = user.role === UserRole.PLATFORM_ADMIN;
    const isCollegeAdmin = user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR;

    if (!isPlatformAdmin && !isCollegeAdmin) {
      return NextResponse.json({ error: 'Moderator access required' }, { status: 403 });
    }

    const reports = await prisma.messageReport.findMany({
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        message: {
          include: {
            sender: { select: { id: true, name: true, email: true } },
            conversation: {
              select: {
                id: true,
                title: true,
                claimId: true,
                itemId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ reports });
  } catch (error) {
    return errorResponse(error);
  }
}
