import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId: id,
        userId: user.id,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: 'Conversation marked as read' });
  } catch (error) {
    return errorResponse(error);
  }
}

