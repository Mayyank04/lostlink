'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, Building2, ArrowRight, UserPlus } from 'lucide-react';

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

function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live campus auto-detection
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
          setDetectionError(data.message || 'Domain not recognized');
        }
      } catch {
        setDetectedCollege(null);
        setDetectionError('Unable to verify university domain');
      } finally {
        setIsDetecting(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      error('Name Required', 'Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      error('Email Required', 'Please enter your institutional email.');
      return;
    }

    if (!detectedCollege) {
      error(
        'Valid Institutional Email Required',
        detectionError || 'Please provide an official university-issued email to identify your campus.'
      );
      return;
    }

    if (password.length < 8) {
      error('Password Too Short', 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      error('Passwords Do Not Match', 'Please ensure both password fields match exactly.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        studentId: studentId.trim() || undefined,
        collegeId: detectedCollege.id,
      });

      if (res.success) {
        success(
          'Verification Code Dispatched',
          `We sent an institutional verification code to ${email.trim()}.`
        );
        router.push(
          `/auth/verify-college?email=${encodeURIComponent(email.trim().toLowerCase())}&college=${encodeURIComponent(detectedCollege.id)}`
        );
      } else {
        error('Registration Failed', res.error || 'Could not complete registration.');
      }
    } catch {
      error('Network Error', 'Could not communicate with registration server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <Input
            label="Full Name *"
            type="text"
            placeholder="Maya Lin"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div>
          <Input
            label="Institutional University Email *"
            type="email"
            placeholder="student@institution.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Use your official college-issued address (e.g. @ncuindia.edu, @apex.edu). Personal email providers are rejected.
          </p>
        </div>

        {/* Live Institutional Campus Detection Display */}
        {isDetecting && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500">
            <div className="w-3.5 h-3.5 border-2 border-brandTeal-600 border-t-transparent rounded-full animate-spin" />
            <span>Auto-detecting campus from institutional email domain...</span>
          </div>
        )}

        {detectedCollege && !isDetecting && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/20 text-xs animate-in fade-in duration-200">
            <div
              className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm"
              style={{ backgroundColor: detectedCollege.primaryColor || '#0F766E' }}
            >
              {detectedCollege.shortName ? detectedCollege.shortName.charAt(0) : detectedCollege.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                <span className="truncate">{detectedCollege.name}</span>
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Verified Campus Domain • @{detectedCollege.domain}
              </div>
              <div className="text-[10px] text-teal-700 dark:text-teal-300 font-medium mt-0.5">
                Campus Assigned Automatically — No Manual Selection
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

        <div>
          <Input
            label="Student Identifier (Optional)"
            type="text"
            placeholder="e.g. 21CS042"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Used only for internal ownership verification by campus staff; never shown publicly.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
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
          <p className="text-[11px] text-slate-500">Minimum 8 characters.</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Confirm Password *
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandTeal-500/20 focus:border-brandTeal-600 transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full flex items-center justify-center gap-2 py-2.5 font-semibold text-xs mt-2"
          disabled={isLoading || !detectedCollege}
        >
          {isLoading ? (
            'Creating Institutional Account...'
          ) : (
            <>
              Register Verified Account
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </form>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
        <p className="text-xs text-slate-500">
          Already registered?{' '}
          <Link
            href="/login"
            className="font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:underline"
          >
            Sign In to Campus
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

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brandTeal-700 text-white flex items-center justify-center font-black text-xl mx-auto shadow-sm">
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Create Student Account
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Enter your university email. Your college and campus network are automatically identified and verified.
        </p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading registration form...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
