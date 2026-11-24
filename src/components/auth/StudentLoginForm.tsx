'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';

interface DetectedCollege {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  domain: string;
  campusSlug?: string;
  primaryColor?: string;
  logoUrl?: string | null;
}

export function StudentLoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live campus auto-detection state
  const [detectedCollege, setDetectedCollege] = useState<DetectedCollege | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    const trimmed = email.trim();
    if (!trimmed.includes('@') || !trimmed.split('@')[1]?.includes('.')) {
      setDetectedCollege(null);
      setDetectionError(null);
      setIsDetecting(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsDetecting(true);
      setDetectionError(null);
      try {
        const res = await fetch(`/api/auth/resolve-college?email=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (res.ok && data.success && data.college) {
          setDetectedCollege(data.college);
          setDetectionError(null);
        } else {
          setDetectedCollege(null);
          setDetectionError(data.message || 'Domain not registered');
        }
      } catch {
        setDetectedCollege(null);
        setDetectionError('Unable to check university domain');
      } finally {
        setIsDetecting(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [email]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);

    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        success('Signed In Successfully', `Welcome back to LostLink.`);
        
        // Use server-provided canonical redirect if available
        if (res.redirectTo) {
          router.push(res.redirectTo);
        } else {
          const userRole = res.user?.role;
          if (userRole === 'PLATFORM_ADMIN') {
            router.push('/platform-admin');
          } else if (userRole === 'COLLEGE_ADMIN' || userRole === 'COLLEGE_MODERATOR') {
            router.push('/college-admin');
          } else {
            router.push('/dashboard');
          }
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
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        <div>
          <Input
            label="Institutional Student Email *"
            type="email"
            placeholder="student@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        {/* Live Institutional Auto-Detection Badge */}
        {isDetecting && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500">
            <div className="w-3.5 h-3.5 border-2 border-brandTeal-600 border-t-transparent rounded-full animate-spin" />
            <span>Identifying campus from domain...</span>
          </div>
        )}

        {detectedCollege && !isDetecting && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/20 text-xs animate-in fade-in duration-200">
            <div
              className="w-9 h-9 rounded-lg text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm"
              style={{ backgroundColor: detectedCollege.primaryColor || '#0F766E' }}
            >
              {detectedCollege.shortName ? detectedCollege.shortName.charAt(0) : detectedCollege.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <span className="truncate">{detectedCollege.name}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Verified Campus Domain • @{detectedCollege.domain}
              </div>
            </div>
          </div>
        )}

        {detectionError && !isDetecting && email.includes('@') && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 text-[11px] text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>{detectionError}</div>
          </div>
        )}

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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandTeal-500/20 focus:border-brandTeal-600 transition"
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

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-slate-300 text-brandTeal-700 focus:ring-brandTeal-500"
            />
            <span>Remember session on this device</span>
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full flex items-center justify-center gap-2 py-2.5 font-semibold text-xs mt-2"
          disabled={isLoading}
        >
          {isLoading ? (
            'Verifying Institutional Access...'
          ) : (
            <>
              Sign In to Campus
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </form>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
        <p className="text-xs text-slate-500">
          New to your campus lost & found network?{' '}
          <Link
            href="/auth/register"
            className="font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:underline"
          >
            Register Student Account
          </Link>
        </p>

        <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-400">
          <Link
            href="/college-admin/login"
            className="hover:text-slate-700 dark:hover:text-slate-200 transition underline underline-offset-2"
          >
            College Admin Portal
          </Link>
          <span>•</span>
          <Link
            href="/platform-admin/login"
            className="hover:text-slate-700 dark:hover:text-slate-200 transition underline underline-offset-2"
          >
            Platform Super-Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
