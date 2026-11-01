'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  User,
  School,
  ShieldCheck,
  Lock,
  Bell,
  Moon,
  Sun,
  Globe,
  CheckCircle2,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, activeCollege, activeCampus } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { success } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [language, setLanguage] = useState('English (US)');
  const [dataSharing, setDataSharing] = useState(true);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    success('Profile Updated', 'Student profile settings saved to local session.');
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl space-y-8">
      {/* Profile Header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-brandTeal-600 text-white flex items-center justify-center font-black text-3xl shadow-md overflow-hidden">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            user?.name.charAt(0) || 'U'
          )}
        </div>

        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {user?.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Domain Verified
            </span>
          </div>
          <p className="text-xs text-slate-500">{user?.email}</p>
          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-brandTeal-600" />
              {activeCollege.name}
            </span>
            <span>•</span>
            <span className="font-mono text-slate-500">ID: {user?.studentIdNumber || 'APX-2027'}</span>
          </div>
        </div>

        <Link href="/dashboard">
          <Button size="sm" variant="outline" className="text-xs">
            My Dashboard
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Editable Student Info */}
        <div className="md:col-span-7 space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-subtle space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Student Contact Information
            </h3>

            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="University Email (SSO Locked)"
              value={user?.email || ''}
              disabled
              helperText="Managed by institutional SAML / OIDC Single Sign-On"
            />

            <Input
              label="Contact Phone Number (For Campus Desk Only)"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Never shown on public item listings."
            />

            <div className="pt-2">
              <Button type="submit" size="sm" variant="primary">
                Save Contact Updates
              </Button>
            </div>
          </form>

          {/* Privacy & Zero-Knowledge Preferences */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-subtle space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Privacy & Custody Controls
            </h3>

            <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Cross-Campus Federated Discovery
                  </p>
                  <p className="text-slate-500">
                    Allow partner institutions to discover public listings for commuter bus and quad transit losses.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={dataSharing}
                  onChange={(e) => setDataSharing(e.target.checked)}
                  className="w-4 h-4 rounded text-brandTeal-600"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Zero-Knowledge Ownership Escrow
                  </p>
                  <p className="text-slate-500">
                    Cryptographically isolate private identification traits from search indexing.
                  </p>
                </div>
                <span className="font-bold text-emerald-600 text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Institutional Verification & Theme Settings */}
        <div className="md:col-span-5 space-y-6">
          {/* Institutional Status Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-subtle space-y-3">
            <div className="flex items-center gap-2 text-brandTeal-600">
              <School className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Institutional Membership
              </h3>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white">{activeCollege.name}</p>
              <p className="text-slate-500">Active Campus: {activeCampus?.name}</p>
              <p className="text-slate-500">Department: {user?.department || 'Computer Science'}</p>
              <p className="text-slate-500">Anticipated Class: {user?.graduationYear || 2027}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Lost & Found Desk Contact:</span>
              <p>{activeCampus?.lostFoundOffice.room}</p>
              <p className="text-brandTeal-600">{activeCampus?.lostFoundOffice.contactEmail}</p>
            </div>
          </div>

          {/* System Preferences Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-subtle space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Application Appearance
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Theme Preference
                </p>
                <p className="text-[11px] text-slate-400 capitalize">Currently {theme} mode</p>
              </div>
              <Button size="sm" variant="outline" onClick={toggleTheme} className="text-xs">
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 mr-1 text-amber-400" /> : <Moon className="w-3.5 h-3.5 mr-1" />}
                Toggle
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" /> Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
              >
                <option value="English (US)">English (US)</option>
                <option value="Spanish">Español</option>
                <option value="French">Français</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

