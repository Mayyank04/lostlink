'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Bell, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

export function AnnouncementsSection() {
  const { success, error } = useToast();
  const [announcement, setAnnouncement] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/platform-admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.platformAnnouncement) {
          setAnnouncement(data.settings.platformAnnouncement);
        }
      })
      .catch(() => {});
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/platform-admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { platformAnnouncement: announcement.trim() },
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('Announcement Broadcasted', 'The announcement banner will appear across student dashboards.');
      } else {
        error('Failed to Broadcast', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-purple-600" />
          Broadcast Announcements & System Alerts
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Publish high-priority banners visible to all active students and college staff across federated institutions.
        </p>
      </div>

      <form onSubmit={handleBroadcast} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-4 text-xs">
        <div className="space-y-1.5">
          <label className="block font-bold text-slate-900 dark:text-white">
            System Banner Text
          </label>
          <textarea
            rows={4}
            placeholder="e.g. LostLink campus return desks will operate with modified hours during finals week..."
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <p className="text-[11px] text-slate-400">
            Leave blank to remove any active system-wide banner.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button size="sm" variant="outline" type="button" onClick={() => setAnnouncement('')}>
            Clear
          </Button>
          <Button size="sm" variant="primary" type="submit" disabled={isSaving}>
            <Send className="w-3.5 h-3.5 mr-1" />
            {isSaving ? 'Broadcasting...' : 'Broadcast Announcement'}
          </Button>
        </div>
      </form>
    </div>
  );
}

