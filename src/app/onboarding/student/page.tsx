'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import {
  GraduationCap,
  ShieldCheck,
  Building2,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  User,
  Calendar,
  Hash,
  Layers,
} from 'lucide-react';

interface CollegeContext {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  logoUrl?: string | null;
}

export default function StudentOnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [college, setCollege] = useState<CollegeContext | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [course, setCourse] = useState('B.Tech Computer Science');
  const [department, setDepartment] = useState('School of Engineering & Technology');
  const [batch, setBatch] = useState('2023-2027');
  const [admissionYear, setAdmissionYear] = useState('2023');
  const [currentYear, setCurrentYear] = useState('2');
  const [section, setSection] = useState('A');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    async function loadOnboarding() {
      try {
        const res = await fetch('/api/onboarding/student');
        if (res.status === 401) {
          router.push('/login');
          return;
        }

        const data = await res.json();
        if (res.ok && data.student) {
          setCollege(data.student.college);
          setName(data.student.name || '');

          if (data.student.profile) {
            const p = data.student.profile;
            setStudentIdNumber(p.studentIdNumber || '');
            setCourse(p.course || 'B.Tech Computer Science');
            setDepartment(p.department || 'School of Engineering & Technology');
            setBatch(p.batch || '2023-2027');
            setAdmissionYear(String(p.admissionYear || '2023'));
            setCurrentYear(String(p.currentYear || '2'));
            setSection(p.section || 'A');
            setPhoneNumber(p.phoneNumber || '');
          }

          // If already onboarded, can navigate directly to dashboard
          if (data.student.isOnboarded) {
            // Already onboarded
          }
        }
      } catch (err) {
        console.error('Failed to load onboarding status:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOnboarding();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      error('Full Name Required', 'Please provide your full official name.');
      return;
    }

    if (!studentIdNumber.trim()) {
      error('Student ID Required', 'Please enter your institutional enrollment or roll number.');
      return;
    }

    if (!course.trim()) {
      error('Course Required', 'Please select or enter your academic course/program.');
      return;
    }

    if (!department.trim()) {
      error('Department Required', 'Please provide your academic department.');
      return;
    }

    if (!batch.trim()) {
      error('Batch Required', 'Please enter your academic batch (e.g. 2023-2027).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/onboarding/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          studentIdNumber: studentIdNumber.trim(),
          course: course.trim(),
          department: department.trim(),
          batch: batch.trim(),
          admissionYear: parseInt(admissionYear, 10),
          currentYear: parseInt(currentYear, 10),
          section: section.trim() || null,
          phoneNumber: phoneNumber.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        success('Onboarding Completed', 'Your academic profile has been registered.');
        await refreshUser?.();
        router.push(data.redirectTo || '/dashboard');
      } else {
        error('Submission Failed', data.error || 'Could not save your academic profile.');
      }
    } catch {
      error('Network Error', 'Could not communicate with the onboarding server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-brandTeal-100 dark:bg-brandTeal-950 animate-pulse mx-auto" />
        <p className="text-sm text-slate-500 font-medium">Verifying student onboarding context...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-2xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brandTeal-700 text-white flex items-center justify-center font-black text-xl mx-auto shadow-sm">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Complete Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Welcome to LostLink. Please confirm your academic details to activate campus lost & found reporting privileges.
        </p>
      </div>

      {/* Verified Institution Banner (Strictly Read-Only) */}
      <div className="rounded-2xl border border-brandTeal-200 dark:border-brandTeal-900/60 bg-brandTeal-50/50 dark:bg-brandTeal-950/20 p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brandTeal-700 text-white flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brandTeal-800 dark:text-brandTeal-300">
                Verified Institution
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <ShieldCheck className="w-3 h-3" /> Locked
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {college?.name || 'Your Assigned University'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {college?.city}, {college?.state} • Non-transferable campus identity
            </p>
          </div>
        </div>
      </div>

      {/* Academic Details Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card space-y-5"
      >
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brandTeal-600" />
            Academic Enrollment Information
          </h3>
          <span className="text-xs text-slate-400 font-medium">* Required</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mayank Gautam"
            helperText="Matches institutional student roster"
          />

          <Input
            label="Student ID / Enrollment Number *"
            value={studentIdNumber}
            onChange={(e) => setStudentIdNumber(e.target.value)}
            placeholder="e.g. 23CS014 or APX-2027"
            helperText="Used for desk item custody verification"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Program / Degree Course *"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="e.g. B.Tech Computer Science"
          />

          <Input
            label="Academic Department *"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. School of Engineering"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Batch *"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="e.g. 2023-2027"
          />

          <Input
            label="Admission Year *"
            type="number"
            value={admissionYear}
            onChange={(e) => setAdmissionYear(e.target.value)}
            min="2000"
            max="2035"
          />

          <Select
            label="Current Academic Year *"
            value={currentYear}
            onChange={(e) => setCurrentYear(e.target.value)}
          >
            <option value="1">1st Year (Freshman)</option>
            <option value="2">2nd Year (Sophomore)</option>
            <option value="3">3rd Year (Junior)</option>
            <option value="4">4th Year (Senior)</option>
            <option value="5">5th Year (Dual/Integrated)</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Section / Cohort (Optional)"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. Section A, CSE-3"
          />

          <Input
            label="Phone Number (Optional - For Lost & Found Desk)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. +91 98765 43210"
            helperText="Never publicly displayed on lost/found items"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            You can update non-institutional contact preferences later in Profile settings.
          </p>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            className="flex-shrink-0"
          >
            Complete & Enter Campus
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
