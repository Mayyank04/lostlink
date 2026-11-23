'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);

    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        success('Signed In Successfully', `Welcome back to LostLink 2.0.`);
        
        // Server-determined role redirection (zero client-side trust)
        const userRole = res.user?.role;
        if (userRole === 'PLATFORM_ADMIN') {
          router.push('/platform-admin');
        } else if (userRole === 'COLLEGE_ADMIN' || userRole === 'COLLEGE_MODERATOR') {
          router.push('/college-admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        error('Sign In Failed', res.error || 'Invalid institutional email or password.');
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
        <div className="w-12 h-12 rounded-2xl bg-brandTeal-700 text-white flex items-center justify-center font-black text-xl mx-auto shadow-md">
          L
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Sign In to LostLink 2.0
        </h1>
        <p className="text-xs text-slate-500">
          Enter your official institutional email to access your campus lost & found network
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <Input
              label="Official University Email *"
              type="email"
              placeholder="student@institution.edu"
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
                className="flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 pr-10 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandTeal-600 focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-brandTeal-600 focus:ring-brandTeal-500"
              />
              <span>Remember this device</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full text-xs font-bold bg-brandTeal-700 hover:bg-brandTeal-800"
            isLoading={isLoading}
          >
            Sign In with Campus Credentials
          </Button>
        </form>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-brandTeal-600 shrink-0 mt-0.5" />
          <span>
            Strict multi-tenant security: student accounts access their enrolled campus; administrative access is isolated and audited.
          </span>
        </div>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
          New student?{' '}
          <Link href="/auth/register" className="font-bold text-brandTeal-700 dark:text-brandTeal-400 hover:underline">
            Register Institutional Account
          </Link>
        </div>
      </div>
    </div>
  );
}
