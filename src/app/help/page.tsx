import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, MapPin, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function HelpCenterPage() {
  const steps = [
    {
      title: 'Step 1: Discover or Match Item',
      desc: 'Use the campus catalog or check your automated Match Radar. When you find an item matching your lost property, click "This is Mine — Claim Item".',
    },
    {
      title: 'Step 2: Answer Ownership Verification Questions',
      desc: 'Describe unique physical marks, stickers, engraving initials, or lockscreen images. These answers are kept confidential and evaluated solely by the finder or campus custodian.',
    },
    {
      title: 'Step 3: Verification Review & Handover Scheduling',
      desc: 'Once your proof is reviewed and approved, LostLink generates a secure 6-digit exchange code and assigns a verified campus lost & found desk as the meeting point.',
    },
    {
      title: 'Step 4: Physical Exchange & Custody Sign-Off',
      desc: 'Meet at the campus desk, present your university ID card, inspect your belonging, and exchange the 6-digit code to conclude the custody record.',
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl space-y-10">
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-brandTeal-700 dark:text-brandTeal-400">
          Student & Custodian Guide
        </span>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Help Center & Safe Handover Protocol
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
          Guidelines for ensuring safe property returns and maintaining student personal safety on campus.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((s, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-subtle space-y-2"
          >
            <span className="text-xs font-bold text-brandTeal-700 dark:text-brandTeal-400 uppercase tracking-wider">
              {s.title}
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span>Crucial Student Safety Rules</span>
        </div>
        <ul className="space-y-1.5 text-xs text-amber-800/90 dark:text-amber-300 list-disc pl-5 leading-relaxed">
          <li><strong>Never meet in isolated areas:</strong> All item handovers must take place in broad daylight at official university desks (library, union, or police substation).</li>
          <li><strong>No money transfers:</strong> LostLink is a university service. Never pay &ldquo;finders fees&rdquo; or send money online to unlock an item.</li>
          <li><strong>Protect private credentials:</strong> Never disclose phone passwords, bank accounts, or personal addresses in in-app messages.</li>
        </ul>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <span className="text-xs text-slate-500">Need immediate campus safety assistance?</span>
        <Link href="/contact">
          <Button size="sm" variant="outline" className="text-xs">
            Contact Campus Dispatch
          </Button>
        </Link>
      </div>
    </div>
  );
}
