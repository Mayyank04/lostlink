'use client';

import React from 'react';
import { MultiStepReportForm } from '@/components/reports/MultiStepReportForm';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function ReportLostPage() {
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
          {activeCollege.shortName} Verification Escrow
        </span>
      </div>

      <div className="max-w-2xl mx-auto text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Report Lost Belonging
        </h1>
        <p className="text-xs text-slate-500">
          Publish your lost item to trigger instant rule-based matching against campus turned-in property.
        </p>
      </div>

      <MultiStepReportForm reportType="lost" />
    </div>
  );
}

