'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchableCollegeSelector } from '@/components/colleges/SearchableCollegeSelector';
import { CollegeSearchResult } from '@/components/colleges/CollegeCard';
import { ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, XCircle } from 'lucide-react';

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'aol.com',
  'zoho.com',
  'gmx.com',
  'yandex.com',
]);

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { allColleges, switchCollege, register } = useAuth();
  const { success, error } = useToast();

  const queryCollegeId = searchParams.get('college') || '';

  const [colleges, setColleges] = useState<any[]>(allColleges);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [collegeId, setCollegeId] = useState(queryCollegeId || allColleges[0]?.id || '');
  const [selectedCollegeObj, setSelectedCollegeObj] = useState<CollegeSearchResult | null>(null);
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dynamically load active colleges from database and resolve explicit query college ID
  useEffect(() => {
    if (queryCollegeId) {
      fetch(`/api/colleges/search?id=${encodeURIComponent(queryCollegeId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.colleges && data.colleges.length > 0) {
            const targetCol = data.colleges[0];
            setCollegeId(targetCol.id);
            setSelectedCollegeObj(targetCol);
            setColleges((prev) => {
              if (prev.some((c) => c.id === targetCol.id)) return prev;
              return [targetCol, ...prev];
            });
          }
        })
        .catch(() => {});
    }

    fetch('/api/colleges/search?limit=50')
      .then((res) => res.json())
      .then((data) => {
        if (data.colleges && data.colleges.length > 0) {
          setColleges((prev) => {
            const combined = [...prev];
            for (const col of data.colleges) {
              if (!combined.some((c) => c.id === col.id)) {
                combined.push(col);
              }
            }
            return combined;
          });
          if (!queryCollegeId && !collegeId) {
            setCollegeId(data.colleges[0].id);
            setSelectedCollegeObj(data.colleges[0]);
          }
        }
      })
      .catch(() => {});
  }, [queryCollegeId]);

  const selectedCollege = selectedCollegeObj || colleges.find((c) => c.id === collegeId);
  const isCollegeVerified = Boolean(
    selectedCollege &&
      (selectedCollege.domainVerificationStatus === 'VERIFIED' || selectedCollege.isVerified)
  );
  const emailDomain = email.includes('@') ? email.split('@')[1]?.toLowerCase().trim() : '';

  const isPublicProvider = emailDomain ? PUBLIC_EMAIL_DOMAINS.has(emailDomain) : false;

  const isDomainAllowed = Boolean(
    emailDomain &&
      !isPublicProvider &&
      selectedCollege &&
      (selectedCollege.emailDomains?.some((d: string) => d.toLowerCase().trim() === emailDomain) ||
        selectedCollege.domain?.toLowerCase().trim() === emailDomain)
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Input Error', 'Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      error('Input Error', 'Please enter your institutional email address.');
      return;
    }
    if (!collegeId) {
      error('Selection Required', 'Please select your enrolled university before registering.');
      return;
    }

    if (!isCollegeVerified) {
      error(
        'Institution Pending Verification',
        'Student registration is not permitted until the university domain has been officially verified by platform administrators.'
      );
      return;
    }

    if (isPublicProvider) {
      error(
        'Public Email Disallowed',
        'Personal email addresses (e.g. Gmail, Yahoo, Outlook) cannot be used. Please register with your official university email.'
      );
      return;
    }

    if (!isDomainAllowed) {
      error(
        'Domain Mismatch',
        `Your email domain "@${emailDomain}" is not authorized for ${selectedCollege?.name || 'the selected university'}.`
      );
      return;
    }

    if (!password) {
      error('Password Required', 'Please create a secure password.');
      return;
    }

    if (password.length < 8) {
      error('Password Too Short', 'Password must be at least 8 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      error('Password Mismatch', 'The passwords entered do not match. Please verify and retype.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        collegeId,
        studentId: studentId.trim() || undefined,
      });

      if (res.success) {
        switchCollege(collegeId);
        success(
          'Verification Code Dispatched',
          'A 6-digit confirmation code was dispatched to your institutional inbox. Please enter the OTP to activate your account.'
        );
        router.push(
          `/auth/verify-college?email=${encodeURIComponent(email.trim().toLowerCase())}&college=${encodeURIComponent(collegeId)}`
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
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brandTeal-700 text-white flex items-center justify-center font-black text-xl mx-auto shadow-md">
          L
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Create Student Account
        </h1>
        <p className="text-xs text-slate-500">
          Federated institutional lost-and-found registry across partner universities
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          <Input
            label="Full Name *"
            placeholder="Maya Lin"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />

          {/* Searchable College Selector */}
          <div>
            <SearchableCollegeSelector
              selectedCollegeId={collegeId}
              onSelectCollege={(col) => {
                setCollegeId(col.id);
                setSelectedCollegeObj(col);
              }}
            />
            {selectedCollege && (
              <p className="text-[10px] text-brandTeal-600 dark:text-brandTeal-400 mt-1 font-mono">
                Approved institutional domain(s): @
                {selectedCollege.emailDomains?.join(', @') || selectedCollege.domain}
              </p>
            )}
            {selectedCollege && !isCollegeVerified && (
              <div className="mt-2 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Selected institution is awaiting official domain verification. Registrations are disabled until verified.</span>
              </div>
            )}
          </div>

          <div>
            <Input
              label="Official Institutional Email *"
              type="email"
              placeholder={`student@${selectedCollege?.domain || selectedCollege?.emailDomains?.[0] || 'institution.edu'}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            {/* Real-time Domain Verification Status Indicator */}
            {emailDomain && (
              <div className="mt-1.5 p-2 rounded-lg text-[11px] leading-tight">
                {isPublicProvider ? (
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Personal email (@{emailDomain}) rejected. Please use your official university email.</span>
                  </div>
                ) : isDomainAllowed ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Approved institutional domain (@{emailDomain}) verified for {selectedCollege?.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Domain @{emailDomain} does not match {selectedCollege?.name || 'the selected university'}.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Input
            label="Student Identification Number (Optional)"
            placeholder="e.g. APX-2027-4921 or IILM-2026-8801"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />

          {/* Password with toggle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Create Password * (min. 8 characters)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
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

          {/* Confirm Password with toggle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 pr-10 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandTeal-600 focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-[11px] text-rose-600 font-medium">Passwords do not match.</p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-brandTeal-600 shrink-0 mt-0.5" />
            <span>
              Cryptographic Argon2id password hashing and 6-digit email OTP verification safeguard your institutional identity.
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full text-xs font-bold bg-brandTeal-700 hover:bg-brandTeal-800"
            isLoading={isLoading}
            disabled={!isDomainAllowed || isPublicProvider || !isCollegeVerified || (Boolean(password) && password !== confirmPassword)}
          >
            Continue to Email Verification
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
          Already registered?{' '}
          <Link href="/auth/login" className="font-bold text-brandTeal-700 dark:text-brandTeal-400 hover:underline">
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-xs text-slate-400">
          Loading registration portal...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
