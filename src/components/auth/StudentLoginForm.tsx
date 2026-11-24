'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  RefreshCw,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

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

interface SandboxStatus {
  enabled: boolean;
  sandboxOtp: string | null;
  label: string | null;
}

function StudentLoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, serverAuthenticated, loginWithOtp, sendOtp, login } = useAuth();
  const { success, error } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (user && serverAuthenticated) {
      if (user.role === 'platform_admin' || (user.role as any) === 'PLATFORM_ADMIN') {
        router.replace('/platform-admin');
      } else if (user.role === 'college_admin' || (user.role as any) === 'COLLEGE_ADMIN') {
        router.replace('/college-admin');
      } else if (!user.isOnboarded) {
        router.replace('/onboarding/student');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, serverAuthenticated, router]);

  // Step state: 'email' | 'otp' | 'password'
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');

  // Form inputs
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & loading
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Live campus detection state
  const [detectedCollege, setDetectedCollege] = useState<DetectedCollege | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Sandbox status
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>({
    enabled: process.env.NEXT_PUBLIC_AUTH_SANDBOX_MODE === 'true',
    sandboxOtp: process.env.NEXT_PUBLIC_AUTH_SANDBOX_MODE === 'true' ? '123456' : null,
    label: process.env.NEXT_PUBLIC_AUTH_SANDBOX_MODE === 'true' ? 'SANDBOX MODE — TEST OTP: 123456' : null,
  });

  // Resend cooldown timer (60s)
  const [cooldown, setCooldown] = useState(0);

  // Fetch server-authoritative sandbox status
  useEffect(() => {
    fetch('/api/auth/sandbox-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSandboxStatus(data);
        }
      })
      .catch(() => {});
  }, []);

  // Cooldown timer interval
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Real-time college domain resolution
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
          setDetectionError(data.message || 'Domain not registered on LostLink');
        }
      } catch {
        setDetectedCollege(null);
        setDetectionError('Unable to check institutional domain');
      } finally {
        setIsDetecting(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [email]);

  // Step 1: Submit Email and Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    if (!detectedCollege) {
      error('Institutional Email Required', detectionError || 'Please enter a valid institutional email address.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await sendOtp(trimmedEmail);
      if (res.success) {
        if (res.sandboxMode) {
          setSandboxStatus({
            enabled: true,
            sandboxOtp: '123456',
            label: 'SANDBOX MODE — TEST OTP: 123456',
          });
          success('Sandbox Mode Active', 'Test OTP: 123456 ready for local verification.');
        } else {
          success('Verification Code Dispatched', `A 6-digit verification code was sent to ${trimmedEmail}`);
        }
        setStep('otp');
        setCooldown(60);
      } else {
        error('Verification Request Failed', res.error || 'Failed to dispatch verification code.');
      }
    } catch {
      error('Network Error', 'Unable to reach the authentication service.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Submit and Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedOtp = otp.trim();

    if (!trimmedOtp || trimmedOtp.length < 6) {
      error('Invalid Code', 'Please enter a 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithOtp(trimmedEmail, trimmedOtp);
      if (res.success) {
        success('Campus Verification Successful', 'Welcome to LostLink.');
        const target = res.redirectTo || '/dashboard';
        router.push(target);
      } else {
        error('Verification Failed', res.error || 'Invalid or expired verification code.');
      }
    } catch {
      error('Network Error', 'Could not communicate with authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Alternative: Password Login Handler
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        success('Signed In Successfully', 'Welcome back to LostLink.');
        const target = res.redirectTo || '/dashboard';
        router.push(target);
      } else {
        error('Sign In Failed', res.error || 'Invalid institutional email or password.');
      }
    } catch {
      error('Network Error', 'Could not communicate with authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP Action
  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsSendingOtp(true);
    try {
      const res = await sendOtp(email.trim());
      if (res.success) {
        setCooldown(60);
        if (res.sandboxMode) {
          success('Sandbox Mode', 'Test OTP remains: 123456');
        } else {
          success('Code Resent', `A new verification code was dispatched to ${email.trim()}`);
        }
      } else {
        error('Resend Failed', res.error || 'Could not resend code.');
      }
    } catch {
      error('Network Error', 'Could not communicate with authentication server.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
      {/* Sandbox Mode Notification Banner */}
      {sandboxStatus.enabled && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex items-start gap-3 text-xs animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <div className="font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>SANDBOX MODE — TEST OTP: 123456</span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Local testing enabled. Enter any registered institutional email, then submit fixed OTP{' '}
              <code className="px-1 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 font-mono font-bold">123456</code>.
              No real email will be sent.
            </p>
          </div>
        </div>
      )}

      {/* STEP 1: Institutional Email Input */}
      {step === 'email' && (
        <form onSubmit={handleRequestOtp} className="space-y-4 text-xs">
          <div>
            <Input
              label="Institutional Student Email *"
              type="email"
              placeholder="student@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          {/* Detecting animation */}
          {isDetecting && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500">
              <div className="w-3.5 h-3.5 border-2 border-brandTeal-600 border-t-transparent rounded-full animate-spin" />
              <span>Verifying campus institutional domain...</span>
            </div>
          )}

          {/* Verified College Badge */}
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
                  Verified Institutional Domain • @{detectedCollege.domain}
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {detectionError && !isDetecting && email.includes('@') && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-[11px] text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>{detectionError}</div>
            </div>
          )}

          {/* Eligibility explanation */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Institutional Email Requirement:</p>
            <p>
              LostLink enforces zero-trust university federation. Only verified student/faculty emails issued by registered campuses can access campus networks.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full flex items-center justify-center gap-2 py-2.5 font-semibold text-xs mt-2"
            disabled={isSendingOtp || !detectedCollege}
          >
            {isSendingOtp ? (
              'Checking Campus Authorization...'
            ) : (
              <>
                Continue with Institutional Email
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setStep('password')}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition underline underline-offset-2"
            >
              Sign in with password instead
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: OTP Verification Screen */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
          {/* Target College Badge */}
          {detectedCollege && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/40 dark:bg-teal-950/20 text-xs">
              <div
                className="w-7 h-7 rounded-md text-white font-bold flex items-center justify-center text-xs shrink-0"
                style={{ backgroundColor: detectedCollege.primaryColor || '#0F766E' }}
              >
                {detectedCollege.shortName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <span className="font-semibold text-slate-900 dark:text-white truncate block">
                  {detectedCollege.name}
                </span>
                <span className="text-[10px] text-slate-500">@{detectedCollege.domain}</span>
              </div>
            </div>
          )}

          <div className="space-y-1 text-center py-1">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Enter Verification Code
            </h3>
            <p className="text-[11px] text-slate-500">
              {sandboxStatus.enabled ? (
                <>
                  Sandbox Mode active. Use test OTP:{' '}
                  <span className="font-mono font-black text-amber-700 dark:text-amber-400">123456</span>
                </>
              ) : (
                <>Code dispatched to <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span></>
              )}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 text-center">
              6-Digit Verification OTP
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder={sandboxStatus.enabled ? '123456' : '••••••'}
              autoFocus
              required
              className="w-full text-center tracking-[0.4em] font-mono font-bold text-xl py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brandTeal-500/20 focus:border-brandTeal-600 transition"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full flex items-center justify-center gap-2 py-2.5 font-semibold text-xs mt-2"
            disabled={isLoading || otp.length < 6}
          >
            {isLoading ? (
              'Verifying Campus Access...'
            ) : (
              <>
                Verify & Enter Campus
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
              }}
              className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              <ArrowLeft className="w-3 h-3" />
              Change email
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isSendingOtp}
              className={`flex items-center gap-1 font-semibold ${
                cooldown > 0
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-brandTeal-700 dark:text-brandTeal-400 hover:underline'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Fallback Password Login */}
      {step === 'password' && (
        <form onSubmit={handlePasswordLogin} className="space-y-4 text-xs">
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

          <Button
            type="submit"
            variant="primary"
            className="w-full flex items-center justify-center gap-2 py-2.5 font-semibold text-xs mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              'Verifying Credentials...'
            ) : (
              <>
                Sign In with Password
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setStep('email')}
              className="text-[11px] text-brandTeal-700 dark:text-brandTeal-400 font-semibold hover:underline"
            >
              Sign in with OTP verification code instead
            </button>
          </div>
        </form>
      )}

      {/* Footer Navigation */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
        <p className="text-xs text-slate-500">
          First time on LostLink?{' '}
          <Link
            href="/register"
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

export function StudentLoginForm() {
  return (
    <React.Suspense
      fallback={
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading sign in portal...
        </div>
      }
    >
      <StudentLoginFormContent />
    </React.Suspense>
  );
}
