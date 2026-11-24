import React from 'react';
import { Metadata } from 'next';
import { StudentLoginForm } from '@/components/auth/StudentLoginForm';
import { GraduationCap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Student Sign In | LostLink Campus Identity',
  description: 'Sign in to your verified campus lost & found network using your institutional university email.',
};

export default function StudentLoginPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brandTeal-700 text-white flex items-center justify-center font-black text-xl mx-auto shadow-sm">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Student Campus Sign In
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Enter your university email. Your college and campus network are automatically detected and verified.
        </p>
      </div>

      <StudentLoginForm />
    </div>
  );
}
