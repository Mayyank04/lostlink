import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';

export const dynamic = 'force-dynamic';

const reportMessageSchema = z.object({
  reason: z.string().min(5, 'Please provide a reason for reporting this message'),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            participants: true,
            claim: { include: { item: true } },
            item: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const isParticipant = message.conversation.participants.some((p) => p.userId === user.id);
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'You can only report messages from conversations you are in' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = reportMessageSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { reason } = result.data;

    const report = await prisma.messageReport.create({
      data: {
        messageId: message.id,
        reporterId: user.id,
        reason,
        status: 'PENDING',
      },
    });

    const collegeId = message.conversation.claim?.item.collegeId || message.conversation.item?.collegeId || null;

    if (collegeId) {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          collegeId,
          action: 'MESSAGE_REPORTED',
          resourceType: 'MESSAGE',
          resourceId: message.id,
          metadata: JSON.stringify({ reason }),
        },
      });
    }

    return NextResponse.json({
      message: 'Message report submitted to university moderator team',
      report,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
