'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Shield,
  Bell,
  Mail,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';

export function SettingsSection() {
  const { success, error } = useToast();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/platform-admin/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setMetadata(data.metadata || {});
      } else {
        error('Error', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/platform-admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();
      if (data.success) {
        success('Platform Settings Saved', data.message);
      } else {
        error('Save Failed', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateKey = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Global Platform Governance & Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic platform parameters, registration controls, security policies, and broadcast announcements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadSettings} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Reload
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-400">Loading settings...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Shield className="w-4 h-4 text-purple-600" />
              Access & Security Governance
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Maintenance Mode</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Restricts non-admin access while conducting maintenance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateKey('maintenanceMode', settings.maintenanceMode === 'true' ? 'false' : 'true')}
                  className={`p-1 rounded-full transition-colors ${
                    settings.maintenanceMode === 'true' ? 'text-purple-600' : 'text-slate-400'
                  }`}
                >
                  {settings.maintenanceMode === 'true' ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Open Registration</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Allow new student self-registration across onboarded colleges.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateKey('openRegistration', settings.openRegistration === 'true' ? 'false' : 'true')}
                  className={`p-1 rounded-full transition-colors ${
                    settings.openRegistration === 'true' ? 'text-purple-600' : 'text-slate-400'
                  }`}
                >
                  {settings.openRegistration === 'true' ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Enforce Domain Matching</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Require student email domain to match college approved domain list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateKey('requireEmailDomainMatch', settings.requireEmailDomainMatch === 'true' ? 'false' : 'true')}
                  className={`p-1 rounded-full transition-colors ${
                    settings.requireEmailDomainMatch === 'true' ? 'text-purple-600' : 'text-slate-400'
                  }`}
                >
                  {settings.requireEmailDomainMatch === 'true' ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <label className="block font-bold text-slate-900 dark:text-white">
                  Max Active Claims Per Student
                </label>
                <input
                  type="number"
                  value={settings.maxClaimsPerStudent || 5}
                  onChange={(e) => updateKey('maxClaimsPerStudent', e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Bell className="w-4 h-4 text-purple-600" />
              Support & System Announcements
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <Input
                label="Official Support Email"
                placeholder="support@lostlink.org"
                value={settings.supportEmail || ''}
                onChange={(e) => updateKey('supportEmail', e.target.value)}
              />

              <Input
                label="Default Matching Confidence Threshold (0.1 - 1.0)"
                placeholder="0.65"
                value={settings.defaultMatchThreshold || '0.65'}
                onChange={(e) => updateKey('defaultMatchThreshold', e.target.value)}
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="block font-bold text-slate-900 dark:text-white">
                Platform-Wide Broadcast Announcement
              </label>
              <textarea
                rows={3}
                placeholder="Banner announcement displayed to all logged-in students..."
                value={settings.platformAnnouncement || ''}
                onChange={(e) => updateKey('platformAnnouncement', e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" variant="primary" type="submit" disabled={isSaving} className="font-bold">
              <Save className="w-3.5 h-3.5 mr-1" />
              {isSaving ? 'Saving Changes...' : 'Save Platform Settings'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
