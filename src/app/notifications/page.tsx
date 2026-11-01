'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { NotificationItem } from '@/types/notification';
import { NotificationService } from '@/lib/services/api';
import { timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Bell,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Check,
  Settings,
  Mail,
  Smartphone,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { success } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'preferences'>('all');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [matchAlerts, setMatchAlerts] = useState(true);
  const [claimAlerts, setClaimAlerts] = useState(true);

  const fetchNotifs = async () => {
    if (!user) return;
    const items = await NotificationService.getNotifications(user.id);
    setNotifications(items);
  };

  useEffect(() => {
    fetchNotifs();
  }, [user?.id]);

  const handleMarkAsRead = async (id: string) => {
    await NotificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await NotificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    success('Notifications Updated', 'All items marked as read.');
  };

  const filtered =
    activeTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const getIcon = (type: string) => {
    switch (type) {
      case 'match_found':
        return <Sparkles className="w-4 h-4 text-brandTeal-600" />;
      case 'claim_received':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'claim_approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'claim_rejected':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs text-slate-500">
            Real-time match alerts, ownership claim statuses, and custody return confirmations
          </p>
        </div>

        {activeTab !== 'preferences' && notifications.some((n) => !n.isRead) && (
          <Button size="sm" variant="outline" onClick={handleMarkAllRead} className="text-xs">
            <Check className="w-3.5 h-3.5 mr-1" /> Mark All as Read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'unread'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Unread ({notifications.filter((n) => !n.isRead).length})
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
            activeTab === 'preferences'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" /> Preferences
        </button>
      </div>

      {/* Notifications List or Preferences */}
      {activeTab === 'preferences' ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Campus Notification Channels
          </h3>

          <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Instant Match Radar Alerts
                </p>
                <p className="text-slate-500">
                  Notify me immediately when rule-based engine scores a match above 75%.
                </p>
              </div>
              <input
                type="checkbox"
                checked={matchAlerts}
                onChange={(e) => setMatchAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-brandTeal-600"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Ownership Claim Updates
                </p>
                <p className="text-slate-500">
                  Alert me when a claim is submitted, reviewed, or approved for my items.
                </p>
              </div>
              <input
                type="checkbox"
                checked={claimAlerts}
                onChange={(e) => setClaimAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-brandTeal-600"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  University Email Notifications (@apex.edu)
                </p>
                <p className="text-slate-500">
                  Send summary digests and critical security OTP codes to verified student inbox.
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-brandTeal-600"
              />
            </div>
          </div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                !item.isRead
                  ? 'border-brandTeal-300 dark:border-brandTeal-800 bg-brandTeal-50/30 dark:bg-brandTeal-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {timeAgo(item.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {item.message}
                </p>

                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {item.linkUrl && (
                    <Link
                      href={item.linkUrl}
                      onClick={() => handleMarkAsRead(item.id)}
                      className="text-xs font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:underline"
                    >
                      View Details →
                    </Link>
                  )}
                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(item.id)}
                      className="text-[11px] text-slate-400 hover:text-slate-600"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Notifications"
          description="You are completely caught up with all campus lost & found activity."
        />
      )}
    </div>
  );
}

