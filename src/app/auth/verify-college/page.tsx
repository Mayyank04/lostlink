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
  const collegeId = searchParams.get('college') || '';
  const { allColleges, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const college = allColleges.find((c) => c.id === collegeId) || allColleges[0];

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      error('Input Required', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifying(true);

    try {
      const res = await fetch('/api/auth/verify-college', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, collegeId, otpCode: otpCode.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        await refreshUser?.();
        success('College Email Verified', 'Your student identity is now active and protected.');
        router.push('/dashboard');
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
        body: JSON.stringify({ email }),
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
        {college && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Institution:</span>
            <p className="font-bold text-slate-900 dark:text-white">{college.name}</p>
            {college.domain && <p className="text-[11px] text-slate-500">Domain: @{college.domain}</p>}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4 text-xs">
          <Input
            label="Enter 6-Digit Email Code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="123456"
            helperText="Check your university email inbox (and spam folder) for the verification code."
            className="text-center font-mono text-lg font-bold tracking-widest"
            maxLength={6}
            required
          />

          <Button type="submit" variant="primary" size="md" className="w-full text-xs font-bold" isLoading={isVerifying}>
            Complete College Verification <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 flex items-center justify-center gap-1">
          <span>Didn&apos;t receive email?</span>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isResending}
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
