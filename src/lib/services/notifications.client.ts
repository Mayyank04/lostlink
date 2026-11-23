import { NotificationItem } from '@/types/notification';
import {
  getStoredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/storage/localStore';

/**
 * Notification Service
 */
export const NotificationService = {
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data.notifications && Array.isArray(data.notifications)) {
          return data.notifications.map((n: any) => ({
            id: n.id,
            userId,
            type: n.type.toLowerCase().includes('claim') ? 'claim_received' : 'system_update',
            title: n.title,
            message: n.message,
            linkUrl: n.linkUrl || '/dashboard',
            isRead: n.isRead,
            createdAt: n.createdAt,
          }));
        }
      }
    } catch {
      // Fallback
    }

    const all = getStoredNotifications();
    return all.filter((n) => n.userId === userId || n.userId === 'user-maya');
  },

  async markAsRead(id: string): Promise<void> {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch {}
    markNotificationAsRead(id);
  },

  async markAllAsRead(): Promise<void> {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch {}
    markAllNotificationsAsRead();
  },
};
