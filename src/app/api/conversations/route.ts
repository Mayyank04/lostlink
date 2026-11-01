import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';

export const dynamic = 'force-dynamic';

const createConversationSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  claimId: z.string().optional().nullable(),
  itemId: z.string().optional().nullable(),
  initialMessage: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);

    // Find all conversations where current user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: user.id },
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        claim: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            itemId: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            reportNumber: true,
            status: true,
            category: true,
            images: { take: 1, select: { url: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Compute unread message count for each conversation
    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const myParticipantRecord = conv.participants.find((p) => p.userId === user.id);
        const lastReadAt = myParticipantRecord?.lastReadAt || new Date(0);

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: user.id },
            createdAt: { gt: lastReadAt },
          },
        });

        const otherParticipants = conv.participants
          .filter((p) => p.userId !== user.id)
          .map((p) => ({
            id: p.user.id,
            name: p.user.name,
            email: p.user.email,
            role: p.user.role,
          }));

        const latestMsg = conv.messages[0]
          ? {
              id: conv.messages[0].id,
              content: conv.messages[0].content,
              senderId: conv.messages[0].senderId,
              senderName: conv.messages[0].sender.name,
              createdAt: conv.messages[0].createdAt.toISOString(),
            }
          : null;

        return {
          id: conv.id,
          claimId: conv.claimId,
          itemId: conv.itemId,
          title: conv.title || (conv.item ? conv.item.name : 'Claim Conversation'),
          item: conv.item
            ? {
                id: conv.item.id,
                name: conv.item.name,
                reportNumber: conv.item.reportNumber,
                status: conv.item.status,
                imageUrl: conv.item.images[0]?.url || null,
              }
            : null,
          claim: conv.claim
            ? {
                id: conv.claim.id,
                referenceNumber: conv.claim.referenceNumber,
                status: conv.claim.status,
              }
            : null,
          participants: otherParticipants,
          latestMessage: latestMsg,
          unreadCount,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ conversations: formatted });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const result = createConversationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { recipientId, claimId, itemId, initialMessage } = result.data;

    if (recipientId === user.id) {
      return NextResponse.json({ error: 'Cannot initiate a conversation with yourself' }, { status: 400 });
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true, email: true },
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient user does not exist' }, { status: 404 });
    }

    // Check if a conversation between these users already exists for this claim or item
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          claimId ? { claimId } : {},
          itemId ? { itemId } : {},
          { participants: { some: { userId: user.id } } },
          { participants: { some: { userId: recipientId } } },
        ],
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    if (existing) {
      // If initialMessage was provided, append it
      if (initialMessage && initialMessage.trim().length > 0) {
        await prisma.message.create({
          data: {
            conversationId: existing.id,
            senderId: user.id,
            content: initialMessage.trim(),
          },
        });
        await prisma.conversation.update({
          where: { id: existing.id },
          data: { updatedAt: new Date() },
        });
      }

      return NextResponse.json({
        message: 'Conversation retrieved',
        conversation: existing,
      });
    }

    // Determine default title
    let title = 'Direct Message';
    if (claimId) {
      const claim = await prisma.claim.findUnique({
        where: { id: claimId },
        include: { item: true },
      });
      if (claim) {
        title = `Inquiry: ${claim.item.name} (${claim.referenceNumber})`;
      }
    } else if (itemId) {
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (item) {
        title = `Inquiry: ${item.name} (${item.reportNumber})`;
      }
    }

    const newConversation = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          claimId: claimId || null,
          itemId: itemId || null,
          title,
          participants: {
            create: [
              { userId: user.id, lastReadAt: new Date() },
              { userId: recipientId, lastReadAt: new Date(0) },
            ],
          },
        },
      });

      if (initialMessage && initialMessage.trim().length > 0) {
        await tx.message.create({
          data: {
            conversationId: conv.id,
            senderId: user.id,
            content: initialMessage.trim(),
          },
        });

        await tx.notification.create({
          data: {
            userId: recipientId,
            type: 'new_message',
            title: `New Message from ${user.name}`,
            message: initialMessage.length > 80 ? `${initialMessage.slice(0, 77)}...` : initialMessage,
            resourceId: conv.id,
            linkUrl: `/messages?conversationId=${conv.id}`,
          },
        });
      }

      return conv;
    });

    return NextResponse.json({
      message: 'Conversation initialized successfully',
      conversation: newConversation,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
