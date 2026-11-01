export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'finder' | 'admin';
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  reportId?: string;
  claimId?: string;
  itemTitle: string;
  itemReference: string;
  participants: {
    id: string;
    name: string;
    role: string;
  }[];
  lastMessage?: string;
  lastMessageTimestamp?: string;
  unreadCount: number;
  isBlocked?: boolean;
}

