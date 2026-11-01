'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, ShieldCheck } from 'lucide-react';

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does LostLink evaluate matching without generative or paid AI APIs?',
      a: 'LostLink strictly uses a transparent, explainable deterministic matching algorithm. Each potential lost and found pair is scored out of 100 points based on Category (25%), Name & Keyword Jaccard Similarity (25%), Primary/Secondary Color (15%), Brand (10%), Campus Building Proximity (15%), and Timeline Plausibility (10%). Scores are fully broken down and auditable by students and campus administrators.',
    },
    {
      q: 'How does zero-knowledge proof verification prevent false ownership claims?',
      a: 'When an owner reports a lost item, they record private clues (e.g. unique scratches, device lockscreen wallpapers, internal pocket contents, serial snippets). These private clues are never visible on the public listing. When someone files a claim, they must provide these answers independently. The finder or campus custodian checks the physical item against those answers.',
    },
    {
      q: 'What is the 6-digit handover exchange code?',
      a: 'Once an ownership claim is verified and scheduled for pickup, the system issues a secure 6-digit exchange code to the claimant. During in-person handover at the campus lost & found desk, the claimant presents this code to the custodian, who inputs it to complete the legal chain of custody.',
    },
    {
      q: 'Can a finder keep the item at the campus lost-and-found desk?',
      a: 'Yes. In fact, campus safety strongly recommends handing found belongings to official university circulation desks (such as Alan Turing Library or the Student Union desk). Finders can check "Deposited with Official Campus Office" to notify everyone of safe custody.',
    },
    {
      q: 'Is multi-campus searching supported across different universities?',
      a: 'Yes! LostLink supports multi-institution scoping. Students can switch campuses or search cross-campus federated listings to discover belongings lost on commuter shuttles or inter-university athletics events.',
    },
    {
      q: 'Can I approve my own claim if I report an item found?',
      a: 'No. The platform enforces anti-self-approval security logic. A user who logged a found report cannot approve their own claim or submit claims to themselves.',
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-3xl space-y-8">
      <div className="space-y-2 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-brandTeal-700 dark:text-brandTeal-400">
          Knowledge Base & FAQ
        </span>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Comprehensive answers to common questions about matching rules, security escrow, and custody policies.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-subtle transition-all"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 text-xs font-bold text-slate-900 dark:text-white"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-brandTeal-600 shrink-0" />
                  {faq.q}
                </span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Still have questions?</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Our campus lost & found support team is available during weekday desk hours.
        </p>
        <Link href="/contact">
          <Button size="sm" variant="primary" className="text-xs">
            Contact Support Office
          </Button>
        </Link>
      </div>
    </div>
  );
}

