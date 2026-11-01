import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-3xl space-y-8 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
      <div className="space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
          <AlertCircle className="w-3 h-3" /> Draft Property Custody Agreement — For Academic Review
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Terms of Service & Property Custody
        </h1>
        <p className="text-slate-400">Last updated: October 2026 • LostLink 2.0 Academic Build</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          1. Finder Obligations & Duty of Care
        </h2>
        <p>
          Students and staff who discover lost property agree to handle items with reasonable care. When turning in items to campus desks (libraries, student union, security), finders must promptly indicate official custody on LostLink so the rightful owner can be directed to the custody desk.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          2. Prohibition of Fraudulent Claims
        </h2>
        <p>
          Submitting fraudulent ownership claims, providing deceptive verification details, or attempting to claim property not belonging to you violates university Student Conduct Codes and may result in disciplinary action and referral to campus safety authorities.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          3. Handover Exchange Protocols
        </h2>
        <p>
          All in-person property handovers must occur at designated campus facilities. Users must never agree to meet in isolated off-campus locations. Both parties must execute the 6-digit verification code handover to conclude institutional custody records.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          4. Limitation of Liability
        </h2>
        <p>
          LostLink is an intermediary facilitation platform. The platform does not assume bailment liability for damaged or unrecovered belongings. All property handovers are governed by university property management policies.
        </p>
      </section>
    </div>
  );
}

