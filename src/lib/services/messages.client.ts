import { Conversation, Message } from '@/types/message';
import {
  getStoredConversations,
  getStoredMessages,
  saveMessage,
  createConversation,
} from '@/lib/storage/localStore';

/**
 * Message Service
 */
export const MessageService = {
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const res = await fetch('/api/conversations', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.conversations && Array.isArray(data.conversations)) {
          return data.conversations.map((c: any) => ({
            id: c.id,
            reportId: c.itemId,
            claimId: c.claimId,
            itemTitle: c.item?.name || c.title || 'Inquiry',
            itemReference: c.item?.reportNumber || (c.claim ? c.claim.referenceNumber : 'INQ'),
            participants: (c.participants || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              role: p.role?.toLowerCase() || 'student',
            })),
            lastMessage: c.latestMessage?.content || '',
            lastMessageTimestamp: c.latestMessage?.createdAt || c.updatedAt,
            unreadCount: c.unreadCount || 0,
            isBlocked: false,
          }));
        }
      }
    } catch {
      // Fallback
    }

    const all = getStoredConversations();
    return all.filter((conv) => conv.participants.some((p) => p.id === userId));
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          return data.messages.map((m: any) => ({
            id: m.id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            senderName: m.senderName,
            senderRole: m.senderRole?.toLowerCase() === 'student' ? 'student' : 'admin',
            content: m.content,
            createdAt: m.createdAt,
            isRead: !m.isSender,
          }));
        }
      }
    } catch {
      // Fallback
    }

    const all = getStoredMessages();
    return all.filter((m) => m.conversationId === conversationId);
  },

  async sendMessage(message: Message): Promise<Message> {
    try {
      const res = await fetch(`/api/conversations/${message.conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.content }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          return {
            id: data.data.id,
            conversationId: data.data.conversationId,
            senderId: data.data.senderId,
            senderName: data.data.senderName,
            senderRole: data.data.senderRole?.toLowerCase() === 'student' ? 'student' : 'admin',
            content: data.data.content,
            createdAt: data.data.createdAt,
            isRead: false,
          };
        }
      }
    } catch {
      // Fallback
    }

    saveMessage(message);
    return message;
  },

  async createConversation(conv: Conversation): Promise<Conversation> {
    try {
      const otherParticipant = conv.participants[0]?.id;
      if (otherParticipant) {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: otherParticipant,
            claimId: conv.claimId,
            itemId: conv.reportId,
            initialMessage: conv.lastMessage,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.conversation) {
            conv.id = data.conversation.id;
          }
        }
      }
    } catch {
      // Fallback
    }

    createConversation(conv);
    return conv;
  },

  async markAsRead(conversationId: string): Promise<void> {
    try {
      await fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' });
    } catch {}
  },

  async reportMessage(messageId: string, reason: string): Promise<void> {
    try {
      await fetch(`/api/messages/${messageId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
    } catch {}
  },
};
