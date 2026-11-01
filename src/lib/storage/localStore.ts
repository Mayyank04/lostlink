'use client';

import { ItemReport } from '@/types/report';
import { ClaimRequest } from '@/types/claim';
import { Conversation, Message } from '@/types/message';
import { NotificationItem } from '@/types/notification';
import { User } from '@/types/user';
import { MOCK_REPORTS, MOCK_CLAIMS, MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_NOTIFICATIONS, MOCK_USERS } from '@/data/mockData';
import { MOCK_COLLEGES } from '@/data/colleges';

const STORAGE_KEYS = {
  REPORTS: 'lostlink_reports_v2',
  CLAIMS: 'lostlink_claims_v2',
  CONVERSATIONS: 'lostlink_conversations_v2',
  MESSAGES: 'lostlink_messages_v2',
  NOTIFICATIONS: 'lostlink_notifications_v2',
  ACTIVE_USER_ID: 'lostlink_active_user_id_v2',
  ACTIVE_COLLEGE_ID: 'lostlink_active_college_id_v2',
};

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error notifying storage listener:', e);
    }
  });
}

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Helper to safely get from localStorage
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

// Helper to safely set in localStorage
function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    notifyListeners();
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

// Initialize storage with demo fixtures if not present
export function initStore(): void {
  if (typeof window === 'undefined') return;

  if (!window.localStorage.getItem(STORAGE_KEYS.REPORTS)) {
    setItem(STORAGE_KEYS.REPORTS, MOCK_REPORTS);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.CLAIMS)) {
    setItem(STORAGE_KEYS.CLAIMS, MOCK_CLAIMS);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)) {
    setItem(STORAGE_KEYS.CONVERSATIONS, MOCK_CONVERSATIONS);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
    setItem(STORAGE_KEYS.MESSAGES, MOCK_MESSAGES);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    setItem(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID)) {
    setItem(STORAGE_KEYS.ACTIVE_USER_ID, 'user-maya');
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.ACTIVE_COLLEGE_ID)) {
    setItem(STORAGE_KEYS.ACTIVE_COLLEGE_ID, 'college-apex');
  }
}

// Reset store to default demo fixtures
export function resetDemoStore(): void {
  if (typeof window === 'undefined') return;
  setItem(STORAGE_KEYS.REPORTS, MOCK_REPORTS);
  setItem(STORAGE_KEYS.CLAIMS, MOCK_CLAIMS);
  setItem(STORAGE_KEYS.CONVERSATIONS, MOCK_CONVERSATIONS);
  setItem(STORAGE_KEYS.MESSAGES, MOCK_MESSAGES);
  setItem(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
  setItem(STORAGE_KEYS.ACTIVE_USER_ID, 'user-maya');
  setItem(STORAGE_KEYS.ACTIVE_COLLEGE_ID, 'college-apex');
}

// Active User & College helpers
export function getActiveUserId(): string {
  return getItem<string>(STORAGE_KEYS.ACTIVE_USER_ID, 'user-maya');
}

export function setActiveUserId(id: string): void {
  setItem(STORAGE_KEYS.ACTIVE_USER_ID, id);
}

export function getActiveCollegeId(): string {
  return getItem<string>(STORAGE_KEYS.ACTIVE_COLLEGE_ID, 'college-apex');
}

export function setActiveCollegeId(id: string): void {
  setItem(STORAGE_KEYS.ACTIVE_COLLEGE_ID, id);
}

export function getUsers(): User[] {
  return MOCK_USERS;
}

// Reports store methods
export function getStoredReports(): ItemReport[] {
  return getItem<ItemReport[]>(STORAGE_KEYS.REPORTS, MOCK_REPORTS);
}

export function saveReport(report: ItemReport): void {
  const reports = getStoredReports();
  const existingIndex = reports.findIndex((r) => r.id === report.id);
  if (existingIndex >= 0) {
    reports[existingIndex] = { ...report, updatedAt: new Date().toISOString() };
  } else {
    reports.unshift(report);
  }
  setItem(STORAGE_KEYS.REPORTS, reports);
}

export function deleteReport(id: string): void {
  const reports = getStoredReports().filter((r) => r.id !== id);
  setItem(STORAGE_KEYS.REPORTS, reports);
}

// Claims store methods
export function getStoredClaims(): ClaimRequest[] {
  return getItem<ClaimRequest[]>(STORAGE_KEYS.CLAIMS, MOCK_CLAIMS);
}

export function saveClaim(claim: ClaimRequest): void {
  const claims = getStoredClaims();
  const existingIndex = claims.findIndex((c) => c.id === claim.id);
  if (existingIndex >= 0) {
    claims[existingIndex] = { ...claim, updatedAt: new Date().toISOString() };
  } else {
    claims.unshift(claim);
  }
  setItem(STORAGE_KEYS.CLAIMS, claims);
}

// Messages & Conversations store methods
export function getStoredConversations(): Conversation[] {
  return getItem<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, MOCK_CONVERSATIONS);
}

export function getStoredMessages(): Message[] {
  return getItem<Message[]>(STORAGE_KEYS.MESSAGES, MOCK_MESSAGES);
}

export function saveMessage(message: Message): void {
  const messages = getStoredMessages();
  messages.push(message);
  setItem(STORAGE_KEYS.MESSAGES, messages);

  // Update conversation last message
  const conversations = getStoredConversations();
  const convIndex = conversations.findIndex((c) => c.id === message.conversationId);
  if (convIndex >= 0) {
    conversations[convIndex].lastMessage = message.content;
    conversations[convIndex].lastMessageTimestamp = message.createdAt;
    setItem(STORAGE_KEYS.CONVERSATIONS, conversations);
  }
}

export function createConversation(conversation: Conversation): void {
  const conversations = getStoredConversations();
  conversations.unshift(conversation);
  setItem(STORAGE_KEYS.CONVERSATIONS, conversations);
}

// Notifications store methods
export function getStoredNotifications(): NotificationItem[] {
  return getItem<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
}

export function saveNotification(notification: NotificationItem): void {
  const notifications = getStoredNotifications();
  notifications.unshift(notification);
  setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

export function markNotificationAsRead(id: string): void {
  const notifications = getStoredNotifications().map((n) =>
    n.id === id ? { ...n, isRead: true } : n
  );
  setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

export function markAllNotificationsAsRead(): void {
  const notifications = getStoredNotifications().map((n) => ({ ...n, isRead: true }));
  setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

