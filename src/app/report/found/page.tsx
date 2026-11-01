'use client';

import React from 'react';
import { MultiStepReportForm } from '@/components/reports/MultiStepReportForm';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function ReportFoundPage() {
  const { activeCollege } = useAuth();

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <span className="text-xs text-brandTeal-700 dark:text-brandTeal-400 font-semibold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          {activeCollege.shortName} Safe Custody
        </span>
      </div>

      <div className="max-w-2xl mx-auto text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Report Found Property
        </h1>
        <p className="text-xs text-slate-500">
          Help return an item to its owner. You can keep it safely in custody or hand it to a campus desk.
        </p>
      </div>

      <MultiStepReportForm reportType="found" />
    </div>
  );
}

