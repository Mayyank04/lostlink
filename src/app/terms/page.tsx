import React from 'react';
import Link from 'next/link';
import { Shield, FileText, ArrowLeft, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function TermsPage() {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-10 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl space-y-8">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-xs text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to LostLink
            </Button>
          </Link>

          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-brandTeal-50 dark:bg-brandTeal-950/60 border border-brandTeal-200 dark:border-brandTeal-800 text-xs font-semibold text-brandTeal-800 dark:text-brandTeal-300">
              <Building2 className="w-3.5 h-3.5" />
              <span>Campus Property Custody Agreement & Terms of Service</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Terms of Service & Institutional Custody Protocol
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Effective Date: November 2026 • Governing Campus Tenant: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">[INSTITUTION_NAME]</span>
            </p>
          </div>
        </div>

        {/* Legal Body */}
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-8 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">1</span>
              Scope of Service & Institutional Role
            </h2>
            <p>
              LostLink 2.0 operates as an institutional property synchronization and verification platform on behalf of participating university campuses (<span className="font-mono">[INSTITUTION_NAME]</span>). The platform facilitates structured lost and found reporting, deterministic candidate matching, and secure zero-knowledge ownership challenges.
            </p>
            <p>
              LostLink is a technical facilitation medium. Neither the software platform nor the host university assumes legal bailment liability for lost, stolen, abandoned, or unrecovered personal belongings. Property custodianship is established only when an item is formally accepted at an authorized campus custody desk (<span className="font-mono">[CAMPUS_LOST_FOUND_OFFICE]</span>).
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">2</span>
              User Eligibility & Academic Domain Verification
            </h2>
            <p>
              Access to report lost items, submit ownership claims, or communicate via campus custody messaging requires an active institutional account verified against an approved university domain (<span className="font-mono">@[CAMPUS_DOMAIN].edu</span>).
            </p>
            <p>
              Users agree to maintain truthful identity profiles. Impersonation of students, faculty, campus police officers, or administrative staff constitutes a direct violation of university conduct codes and results in immediate permanent suspension of platform privileges and referral to Student Judicial Affairs.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">3</span>
              Finder Duties & Surrender Protocol
            </h2>
            <p>
              Campus community members who discover unattended property agree to exercise reasonable care:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>High-value items (laptops, mobile phones, wallets, keys, government/student identification) must be turned in to an official campus custody desk within 24 hours of discovery.</li>
              <li>When reporting a found item on LostLink, finders must accurately designate whether the property remains in personal custody or has been surrendered to an official desk (<span className="font-mono">[CAMPUS_LOST_FOUND_OFFICE]</span>).</li>
              <li>Finders shall not open personal files, browse private communications, or inspect encrypted storage on discovered electronic devices.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">4</span>
              Zero-Knowledge Verification & Fraud Prohibition
            </h2>
            <p>
              Ownership claims require satisfactory answers to zero-knowledge proof challenges (e.g., lockscreen wallpaper details, engraving inscriptions, concealed compartment contents, serial number fragments). Submitting fraudulent claims, guessing proof answers, or attempting unauthorized property retrieval is strictly prohibited.
            </p>
            <p>
              All claim attempts, including submitted answers and IP audit timestamps, are logged in tamper-evident audit trails accessible to university security and campus police (<span className="font-mono">[CAMPUS_POLICE_DISPATCH]</span>).
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">5</span>
              Physical Handover & Exchange Code Execution
            </h2>
            <p>
              Physical property restoration must be executed via the platform&apos;s 6-digit exchange verification code. Both parties must be present at an approved campus location. The finder or desk attendant enters the claimant&apos;s single-use verification token to validate release and close custody liability. Meeting in unmonitored or off-campus locations is prohibited.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">6</span>
              Unclaimed Property & Statutory Abandonment
            </h2>
            <p>
              Property held in official campus custody desks without an active claim will be retained for a mandatory retention period of sixty (60) calendar days in accordance with state abandoned property regulations (<span className="font-mono">[GOVERNING_STATE_JURISDICTION]</span>). After sixty days, unclaimed items may be donated to registered campus charities or disposed of in accordance with university facilities protocol.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">7</span>
              Inquiries & Official Contact
            </h2>
            <p>
              Questions regarding campus custody policies, disputed claims, or institutional onboarding should be directed to the designated campus coordinator:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1 font-mono">
              <p>Institutional Custodian: Office of Student Life & Campus Safety</p>
              <p>Email: <span className="text-brandTeal-700 dark:text-brandTeal-400 font-semibold">[CONTACT_EMAIL]</span></p>
              <p>Facility: <span className="text-slate-600 dark:text-slate-300">[CAMPUS_LOST_FOUND_OFFICE]</span></p>
              <p>Legal Authority: Office of University General Counsel, <span className="text-slate-600 dark:text-slate-300">[GOVERNING_STATE_JURISDICTION]</span></p>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} LostLink 2.0 • Institutional Campus Federation</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-brandTeal-700 dark:text-brandTeal-400 hover:underline">
              Privacy Policy & Student Data Protection
            </Link>
            <Link href="/help" className="text-slate-600 dark:text-slate-400 hover:underline">
              Safe Handover Guide
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
