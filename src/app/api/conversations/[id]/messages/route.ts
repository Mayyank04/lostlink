import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
});

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
        participants: true,
        claim: { include: { item: true } },
        item: true,
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
        { error: 'You are not authorized to view messages in this conversation' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const [total, messages] = await Promise.all([
      prisma.message.count({ where: { conversationId: id } }),
      prisma.message.findMany({
        where: { conversationId: id },
        include: {
          sender: { select: { id: true, name: true, image: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
    ]);

    // Update current user's lastReadAt timestamp
    if (isParticipant) {
      await prisma.conversationParticipant.updateMany({
        where: { conversationId: id, userId: user.id },
        data: { lastReadAt: new Date() },
      });
    }

    const formatted = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderName: m.sender.name,
      senderRole: m.sender.role,
      senderAvatar: m.sender.image,
      content: m.content,
      isSender: m.senderId === user.id,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({
      messages: formatted,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isParticipant = conversation.participants.some((p) => p.userId === user.id);
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Only conversation participants can send messages' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = sendMessageSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { content } = result.data;
    const now = new Date();

    const createdMessage = await prisma.$transaction(async (tx) => {
      // 1. Create message
      const msg = await tx.message.create({
        data: {
          conversationId: id,
          senderId: user.id,
          content: content.trim(),
          createdAt: now,
        },
        include: {
          sender: { select: { id: true, name: true, role: true } },
        },
      });

      // 2. Update conversation updatedAt
      await tx.conversation.update({
        where: { id },
        data: { updatedAt: now },
      });

      // 3. Update sender's lastReadAt
      await tx.conversationParticipant.updateMany({
        where: { conversationId: id, userId: user.id },
        data: { lastReadAt: now },
      });

      // 4. Create notifications for other participants
      const otherParticipants = conversation.participants.filter((p) => p.userId !== user.id);
      for (const p of otherParticipants) {
        await tx.notification.create({
          data: {
            userId: p.userId,
            type: 'new_message',
            title: `New Message from ${user.name}`,
            message: content.length > 80 ? `${content.slice(0, 77)}...` : content,
            resourceId: id,
            linkUrl: `/messages?conversationId=${id}`,
          },
        });
      }

      return msg;
    });

    return NextResponse.json({
      message: 'Message sent successfully',
      data: {
        id: createdMessage.id,
        conversationId: createdMessage.conversationId,
        senderId: createdMessage.senderId,
        senderName: createdMessage.sender.name,
        senderRole: createdMessage.sender.role,
        content: createdMessage.content,
        isSender: true,
        createdAt: createdMessage.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
