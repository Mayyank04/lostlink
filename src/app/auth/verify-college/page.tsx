'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, CheckCircle2, ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

function VerifyCollegeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const urlCollegeId = searchParams.get('college') || '';
  const { user, serverAuthenticated, logout, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [sandboxEnabled, setSandboxEnabled] = useState(process.env.NEXT_PUBLIC_AUTH_SANDBOX_MODE === 'true');
  const [resolvedCollege, setResolvedCollege] = useState<{
    id: string;
    name: string;
    shortName: string | null;
    slug: string;
    domain: string;
    primaryColor?: string;
    logoUrl?: string | null;
  } | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Active session conflict detection
  const hasSessionConflict = Boolean(
    serverAuthenticated && user && email && user.email.toLowerCase() !== email.toLowerCase()
  );

  React.useEffect(() => {
    fetch('/api/auth/sandbox-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.enabled === 'boolean') {
          setSandboxEnabled(data.enabled);
        }
      })
      .catch(() => {});
  }, []);

  // Server-Side Institutional College Resolution via Email Domain
  React.useEffect(() => {
    if (!email) {
      setIsResolving(false);
      setResolveError('No institutional email address provided. Please return to the login page.');
      return;
    }

    setIsResolving(true);
    setResolveError(null);

    fetch(`/api/auth/resolve-college?email=${encodeURIComponent(email)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success && data.college) {
          setResolvedCollege(data.college);
          setResolveError(null);
        } else {
          setResolveError(data.message || 'Unable to resolve your institutional email domain to an approved university.');
        }
      })
      .catch(() => {
        setResolveError('Failed to connect to university domain registry. Please check your internet connection.');
      })
      .finally(() => {
        setIsResolving(false);
      });
  }, [email]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      error('Input Required', 'Please enter the 6-digit verification code.');
      return;
    }

    if (hasSessionConflict) {
      error('Active Session Conflict', 'Please sign out of your current session before verifying a new account.');
      return;
    }

    setIsVerifying(true);

    try {
      const res = await fetch('/api/auth/verify-college', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          collegeId: resolvedCollege?.id || urlCollegeId,
          otpCode: otpCode.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await refreshUser?.();
        success('College Email Verified', 'Your student identity is now active and protected.');
        router.push('/onboarding/student');
      } else {
        error('Verification Failed', data.error || 'The code provided is invalid or has expired.');
      }
    } catch (err: any) {
      error('Verification Error', err.message || 'Unable to complete verification at this time.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      error('Email Required', 'Unable to dispatch code without a valid email address.');
      return;
    }

    setIsResending(true);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          collegeId: resolvedCollege?.id || urlCollegeId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success('Code Dispatched', data.message || 'A fresh 6-digit code has been dispatched to your inbox.');
      } else {
        error('Resend Failed', data.error || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      error('Network Error', err.message || 'Could not communicate with authentication server.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brandTeal-100 dark:bg-brandTeal-950 text-brandTeal-700 dark:text-brandTeal-300 flex items-center justify-center mx-auto shadow-sm">
          <Mail className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Verify Institutional Email
        </h1>
        <p className="text-xs text-slate-500">
          We sent a 6-digit confirmation code to{' '}
          <strong className="text-slate-800 dark:text-slate-200">{email || 'your registered institutional email'}</strong>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
        {/* Active Session Conflict Alert */}
        {hasSessionConflict && user && (
          <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              Active Session Conflict
            </div>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
              You are currently authenticated as <strong>{user.email}</strong> ({user.name}). You are attempting to verify an account for <strong>{email}</strong>.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs w-full font-semibold border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
            >
              Sign Out of {user.email} to Proceed
            </Button>
          </div>
        )}

        {/* Server-Resolved University Institution */}
        {isResolving ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-center text-slate-500 animate-pulse">
            Resolving campus identity from domain...
          </div>
        ) : resolveError ? (
          <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-50/80 dark:bg-rose-950/30 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              Domain Verification Error
            </div>
            <p className="text-rose-800 dark:text-rose-300 leading-relaxed">{resolveError}</p>
            <Link
              href="/login"
              className="inline-block pt-1 font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:underline"
            >
              Return to Student Sign In &rarr;
            </Link>
          </div>
        ) : resolvedCollege ? (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Verified Campus:</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60">
                Official Institutional Record
              </span>
            </div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">{resolvedCollege.name}</p>
            {resolvedCollege.domain && (
              <p className="text-[11px] text-slate-500">Authorized Domain: @{resolvedCollege.domain}</p>
            )}
            {urlCollegeId && urlCollegeId !== resolvedCollege.id && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-1">
                Note: Derived authoritative identity from domain @{resolvedCollege.domain} as {resolvedCollege.name}.
              </p>
            )}
          </div>
        ) : null}

        {sandboxEnabled && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 p-3 text-xs space-y-1">
            <span className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[11px] block">
              SANDBOX MODE — TEST OTP: 123456
            </span>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Submit code <code className="px-1 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 font-mono font-bold">123456</code> to verify locally without waiting for email.
            </p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4 text-xs">
          <Input
            label="Enter 6-Digit Email Code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="123456"
            helperText="Check your university email inbox for the verification code."
            className="text-center font-mono text-lg font-bold tracking-widest"
            maxLength={6}
            disabled={Boolean(resolveError) || hasSessionConflict}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full text-xs font-bold"
            isLoading={isVerifying}
            disabled={Boolean(resolveError) || hasSessionConflict || isResolving}
          >
            Complete College Verification <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 flex items-center justify-center gap-1">
          <span>Didn&apos;t receive email?</span>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isResending || Boolean(resolveError) || hasSessionConflict}
            className="text-brandTeal-700 dark:text-brandTeal-400 font-semibold hover:underline disabled:opacity-50"
          >
            {isResending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyCollegePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading verification session...</div>}>
      <VerifyCollegeContent />
    </Suspense>
  );
}
