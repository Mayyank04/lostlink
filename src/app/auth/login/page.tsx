'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { School, Lock, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { MOCK_USERS } from '@/data/mockData';

export default function LoginPage() {
  const router = useRouter();
  const { loginAs, switchUser } = useAuth();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const ok = loginAs(email);
      if (ok) {
        success('Signed In Successfully', `Welcome back to LostLink 2.0.`);
        router.push('/dashboard');
      } else {
        // Fallback for demo: login as student
        switchUser('user-maya');
        success('Demo Sign-In', 'Signed in as student Maya Lin.');
        router.push('/dashboard');
      }
      setIsLoading(false);
    }, 400);
  };

  const handleQuickLogin = (userId: string) => {
    switchUser(userId);
    const u = MOCK_USERS.find((usr) => usr.id === userId);
    success('Demo Switch', `Signed in as ${u?.name} (${u?.role.replace('_', ' ')}).`);
    router.push('/dashboard');
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brandTeal-700 text-white flex items-center justify-center font-black text-xl mx-auto shadow-md">
          L
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Sign In to LostLink
        </h1>
        <p className="text-xs text-slate-500">
          Enter your university email address or use instant demo credentials
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <Input
            label="University Email (@edu domain)"
            type="email"
            placeholder="maya.lin@apex.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="space-y-1">
            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex justify-end pt-1">
              <Link
                href="/auth/forgot-password"
                className="text-[11px] text-brandTeal-700 dark:text-brandTeal-400 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full text-xs font-bold" isLoading={isLoading}>
            Sign In with Campus SSO
          </Button>
        </form>

        {/* Quick Demo Sign-In Personas */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
            Instant Demo Sign-In Personas
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => handleQuickLogin('user-maya')}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs flex items-center justify-between transition-colors"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Maya Lin (Student Owner)</p>
                <p className="text-[10px] text-slate-400">Computer Science • Apex Tech</p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Student</span>
            </button>

            <button
              onClick={() => handleQuickLogin('user-jordan')}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs flex items-center justify-between transition-colors"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Jordan Hayes (Finder Student)</p>
                <p className="text-[10px] text-slate-400">Mechanical Eng • Apex Tech</p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Finder</span>
            </button>

            <button
              onClick={() => handleQuickLogin('user-admin-apex')}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs flex items-center justify-between transition-colors"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Officer Marcus Vance (Campus Admin)</p>
                <p className="text-[10px] text-slate-400">Campus Safety Desk Custodian</p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">College Admin</span>
            </button>
          </div>
        </div>

        <div className="pt-2 text-center text-xs text-slate-500">
          New to LostLink?{' '}
          <Link href="/auth/register" className="font-bold text-brandTeal-700 dark:text-brandTeal-400 hover:underline">
            Register Student Account
          </Link>
        </div>
      </div>
    </div>
  );
}

