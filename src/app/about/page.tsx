import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { School, ShieldCheck, Cpu, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl space-y-10">
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-brandTeal-700 dark:text-brandTeal-400">
          About LostLink 2.0
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Campus Property Recovery, Re-Engineered.
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          LostLink 2.0 is an enterprise multi-college lost & found platform built as a Cloud Computing Module IV PBL project, tailored to connect disparate campus buildings, libraries, and security desks into an explainable, federated recovery network.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-subtle space-y-3">
          <div className="w-10 h-10 rounded-xl bg-brandTeal-100 dark:bg-brandTeal-950 text-brandTeal-700 dark:text-brandTeal-300 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero-Knowledge Escrow</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Owners define private verification markers (scratches, lockscreen wallpapers, serial snippets) that are kept strictly confidential from the public directory.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-subtle space-y-3">
          <div className="w-10 h-10 rounded-xl bg-brandBlue-100 dark:bg-brandBlue-950 text-brandBlue-700 dark:text-brandBlue-300 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Deterministic Matching</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Transparent 100-point algorithmic engine evaluating Category (25%), Name & Keywords (25%), Color (15%), Brand (10%), Campus Facility (15%), and Timeline Plausibility (10%).
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-subtle space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
            <School className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Multi-Tenant Scoping</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hierarchical multi-campus model supporting autonomous college desks while enabling cross-campus commuter transit search federation.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-3">
        <h3 className="text-base font-bold">Cloud Computing Module IV PBL Architecture</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          The frontend is architected with clean service boundaries ready for integration with a containerized Kubernetes backend, PostgreSQL database, Prisma ORM, and hybrid-cloud orchestration.
        </p>
        <div className="pt-2">
          <Link href="/discover">
            <Button size="sm" variant="primary" className="text-xs">
              Explore Item Directory <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

