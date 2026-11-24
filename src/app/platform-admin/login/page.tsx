'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight, AlertTriangle, KeyRound } from 'lucide-react';

export default function PlatformAdminLoginPage() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    setRoleError(null);

    try {
      const res = await login(email.trim(), password);
      if (res.success && res.user) {
        if (res.user.role === 'PLATFORM_ADMIN') {
          success('Platform Clearance Granted', `Root administrator session established.`);
          router.push('/platform-admin');
        } else {
          await logout();
          setRoleError(
            'Access Denied: Only authorized Platform Administrators can access this portal.'
          );
          error(
            'Platform Super-Admin Access Denied',
            'Your account does not possess global platform administrator privileges.'
          );
        }
      } else {
        error('Sign In Failed', res.error || 'Invalid administrator credentials.');
      }
    } catch {
      error('Network Error', 'Could not communicate with authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-xl mx-auto shadow-sm border border-amber-500/30">
          <KeyRound className="w-6 h-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Root Platform Governance</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Platform Super-Admin Sign In
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Multi-college tenant onboarding, institutional verification, cross-campus moderation, and global security.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
        {roleError && (
          <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Access Prohibited</p>
              <p className="text-[11px] mt-0.5">{roleError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <Input
              label="Super Administrator Email *"
              type="email"
              placeholder="platform-admin@lostlink.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Password *
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-[11px] text-brandTeal-700 dark:text-brandTeal-400 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full flex items-center justify-center gap-2 py-2.5 font-semibold text-xs mt-2 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30"
            disabled={isLoading}
          >
            {isLoading ? (
              'Verifying Root Clearance...'
            ) : (
              <>
                Authenticate Super-Admin
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
          <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <Link
              href="/login"
              className="hover:text-slate-700 dark:hover:text-slate-200 transition underline underline-offset-2"
            >
              Student Campus Sign In
            </Link>
            <span>•</span>
            <Link
              href="/college-admin/login"
              className="hover:text-slate-700 dark:hover:text-slate-200 transition underline underline-offset-2"
            >
              College Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
