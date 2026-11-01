import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        claim: {
          include: {
            claimant: { select: { id: true, name: true } },
            item: { select: { id: true, name: true, reportNumber: true, status: true, collegeId: true } },
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            reportNumber: true,
            status: true,
            collegeId: true,
            images: { take: 1, select: { url: true } },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isParticipant = conversation.participants.some((p) => p.userId === user.id);
    const isPlatformAdmin = user.role === UserRole.PLATFORM_ADMIN;
    const collegeId = conversation.claim?.item.collegeId || conversation.item?.collegeId;
    const isCollegeAdmin =
      Boolean(collegeId) &&
      user.memberships.some(
        (m) =>
          m.collegeId === collegeId &&
          (user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR)
      );

    if (!isParticipant && !isPlatformAdmin && !isCollegeAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to access this conversation thread' },
        { status: 403 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    return errorResponse(error);
  }
}
