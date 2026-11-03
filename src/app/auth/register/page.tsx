'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, School, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { allColleges, switchCollege, register } = useAuth();
  const { success, error } = useToast();

  const [colleges, setColleges] = useState<any[]>(allColleges);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [collegeId, setCollegeId] = useState(allColleges[0]?.id || '');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dynamically load active colleges from database
  useEffect(() => {
    fetch('/api/colleges')
      .then((res) => res.json())
      .then((data) => {
        if (data.colleges && data.colleges.length > 0) {
          setColleges(data.colleges);
          if (!collegeId || !data.colleges.some((c: any) => c.id === collegeId)) {
            setCollegeId(data.colleges[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const selectedCollege = colleges.find((c) => c.id === collegeId);
  const emailDomain = email.includes('@') ? email.split('@')[1]?.toLowerCase() : '';
  const isDomainAllowed =
    emailDomain &&
    selectedCollege &&
    (selectedCollege.emailDomains?.some((d: string) => d.toLowerCase() === emailDomain) ||
      selectedCollege.domain?.toLowerCase() === emailDomain);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsLoading(true);
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password: password || 'Password123!',
        collegeId,
        studentId: studentId.trim() || undefined,
      });

      if (res.success) {
        switchCollege(collegeId);
        success(
          'Account Registered',
          'Verification link sent to your institutional email. Redirecting to verification status...'
        );
        router.push(`/auth/verify-college?email=${encodeURIComponent(email)}&college=${collegeId}`);
      } else {
        error('Registration Failed', res.error || 'Could not create account');
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
        <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-black text-xl mx-auto shadow-md">
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
          />

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Enrolled College / University *
            </label>
            <select
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city}, {c.state})
                </option>
              ))}
            </select>
            {selectedCollege && (
              <p className="text-[10px] text-teal-600 mt-1 font-mono">
                Approved domains: @{selectedCollege.emailDomains?.join(', @') || selectedCollege.domain}
              </p>
            )}
          </div>

          <div>
            <Input
              label="Institutional Email (@edu) *"
              type="email"
              placeholder={`student@${selectedCollege?.domain || selectedCollege?.emailDomains?.[0] || 'institution.edu'}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {emailDomain && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                {isDomainAllowed ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Domain verified for instant access
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Domain requires manual desk verification
                  </span>
                )}
              </div>
            )}
          </div>

          <Input
            label="Student Identification Number (Optional)"
            placeholder="e.g. APX-2027-4921"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />

          <Input
            label="Create Secure Password *"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <span>
              Registration details are kept private under student privacy guidelines. Zero cross-institution tracking.
            </span>
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full text-xs font-bold bg-teal-700 hover:bg-teal-800" isLoading={isLoading}>
            Continue to Institutional Verification
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
          Already registered?{' '}
          <Link href="/auth/login" className="font-bold text-teal-700 dark:text-teal-400 hover:underline">
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
}
