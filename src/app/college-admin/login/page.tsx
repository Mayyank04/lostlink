'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, Building2, Lock, Eye, EyeOff, ArrowRight, AlertTriangle } from 'lucide-react';

export default function CollegeAdminLoginPage() {
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
        const role = res.user.role;
        // Verify College Administrator or Moderator role
        if (role === 'COLLEGE_ADMIN' || role === 'COLLEGE_MODERATOR' || role === 'PLATFORM_ADMIN') {
          success('Administrative Session Established', `Welcome back, ${res.user.name}.`);
          router.push('/college-admin');
        } else {
          // Reject student accounts from the admin portal
          await logout();
          setRoleError(
            'Access Denied: Student accounts cannot access the College Admin Portal. Please use the Student Login.'
          );
          error(
            'Administrative Access Denied',
            'This portal is strictly restricted to authorized College Administrators and Campus Custodians.'
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
        <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-800 text-teal-400 flex items-center justify-center font-black text-xl mx-auto shadow-sm border border-slate-700/50">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Campus Administration Portal</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          College Admin Sign In
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Restricted to authorized campus security, custodians, lost-and-found desk officers, and campus administrators.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
        {roleError && (
          <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Permission Restricted</p>
              <p className="text-[11px] mt-0.5">{roleError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <Input
              label="Staff / Administrator Email *"
              type="email"
              placeholder="admin@institution.edu"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
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
            className="w-full flex items-center justify-center gap-2 py-2.5 font-semibold text-xs mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              'Verifying Administrative Access...'
            ) : (
              <>
                Sign In to Campus Administration
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Are you a student?{' '}
            <Link
              href="/login"
              className="font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:underline"
            >
              Sign In to Student Portal
            </Link>
          </p>

          <div className="pt-2 text-[11px] text-slate-400">
            <Link
              href="/platform-admin/login"
              className="hover:text-slate-700 dark:hover:text-slate-200 transition underline underline-offset-2"
            >
              Platform Super-Admin Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
