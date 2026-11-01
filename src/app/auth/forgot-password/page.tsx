'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { success } = useToast();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSent(true);
    success('Reset Link Dispatched', 'Check your student inbox for password recovery instructions.');
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brandTeal-100 dark:bg-brandTeal-950 text-brandTeal-700 dark:text-brandTeal-300 flex items-center justify-center mx-auto shadow-sm">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Reset Password
        </h1>
        <p className="text-xs text-slate-500">
          We will send password recovery instructions to your verified student email
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
        {isSent ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Instructions Dispatched
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              An account recovery link has been sent to <strong>{email}</strong>.
            </p>
            <Link href="/auth/reset-password">
              <Button size="sm" variant="primary" className="text-xs">
                Proceed to Reset Password
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <Input
              label="University Email"
              type="email"
              placeholder="student@apex.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" size="md" className="w-full text-xs font-bold">
              Send Password Reset Email
            </Button>
          </form>
        )}

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
          <Link href="/auth/login" className="inline-flex items-center gap-1 font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

