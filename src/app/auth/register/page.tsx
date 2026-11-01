'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, School } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { allColleges, switchCollege } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [collegeId, setCollegeId] = useState(allColleges[0].id);
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      switchCollege(collegeId);
      success(
        'Account Registered',
        'Verification link sent to your institutional email. Redirecting to verification status...'
      );
      router.push(`/auth/verify-college?email=${encodeURIComponent(email)}&college=${collegeId}`);
      setIsLoading(false);
    }, 500);
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
          Only essential information required to verify institutional belonging
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

          <Select
            label="Enrolled College / University *"
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
          >
            {allColleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Input
            label="Institutional Email (@edu) *"
            type="email"
            placeholder="student@apex.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helperText="Must match university domain for zero-knowledge validation"
            required
          />

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
            <ShieldCheck className="w-4 h-4 text-brandTeal-600 shrink-0 mt-0.5" />
            <span>
              Registration details are kept private under FERPA/student privacy guidelines.
            </span>
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full text-xs font-bold" isLoading={isLoading}>
            Continue to Institutional Verification
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

