'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Lock, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      error('Password Mismatch', 'New passwords do not match.');
      return;
    }
    if (password.length < 8) {
      error('Password Too Short', 'Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      success('Password Updated', 'Your password has been changed. You can now sign in.');
      router.push('/auth/login');
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brandTeal-100 dark:bg-brandTeal-950 text-brandTeal-700 dark:text-brandTeal-300 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Set New Password
        </h1>
        <p className="text-xs text-slate-500">
          Enter and confirm your new secure account password
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
        <form onSubmit={handleReset} className="space-y-4 text-xs">
          <Input
            label="New Password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" size="md" className="w-full text-xs font-bold" isLoading={isLoading}>
            Update Password & Sign In
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
          <Link href="/auth/login" className="font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:underline">
            Cancel and Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

