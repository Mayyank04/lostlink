import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, ArrowLeft, Building2, EyeOff, Server, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PrivacyPolicyPage() {
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
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>FERPA-Aligned Student Data Protection & Privacy Standard</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Privacy Policy & Zero-Knowledge Data Protection
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Effective Date: November 2026 • Institution Tenant: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">[INSTITUTION_NAME]</span>
            </p>
          </div>
        </div>

        {/* Legal Body */}
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-8 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">1</span>
              Zero-Knowledge Ownership Proof Architecture
            </h2>
            <p>
              LostLink 2.0 is architected under strict privacy-by-design standards. To protect students from impersonation, stalking, and opportunistic fraud, confidential ownership proof attributes are cryptographically isolated from the public directory.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Public vs. Confidential Escrow Separation
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Public Directory Visibility:</p>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">Item Category, General Visual Description, Color, Brand, Campus Facility, and Approximate Date.</p>
                </div>
                <div>
                  <p className="font-semibold text-rose-700 dark:text-rose-400">Confidential Escrow Proofs (Zero-Knowledge):</p>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">Device Serial Numbers, Lockscreen Images, Engravings, Concealed Contents, and Phone Numbers.</p>
                </div>
              </div>
            </div>
            <p>
              Confidential proof responses are never rendered in public search catalogs or indexed by external search engines. They become visible only to authorized custody desk operators (<span className="font-mono">[CAMPUS_LOST_FOUND_OFFICE]</span>) when adjudicating a formal claim.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">2</span>
              FERPA Compliance & Student Record Safeguards
            </h2>
            <p>
              In alignment with the Family Educational Rights and Privacy Act (FERPA), student directory identifiers (including student ID numbers, institutional email addresses, and campus attendance data) are strictly partitioned.
            </p>
            <p>
              No student personal records are sold, leased, licensed, or shared with commercial advertising brokers. Profile information is used exclusively to facilitate verified campus property returns and communicate custody pickup notifications.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">3</span>
              Photographic Evidence & EXIF Metadata Scrubbing
            </h2>
            <p>
              Photographs uploaded by finders or owners undergo automated server-side sanitization:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>Exchangeable Image File Format (EXIF) geolocation coordinates and device camera serial markers are stripped upon upload.</li>
              <li>Images are stored in access-controlled object storage buckets bounded to the reporting tenant.</li>
              <li>Sensitive identity documents (driver&apos;s licenses, credit cards, student ID cards) must have identification numbers obscured before submission.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">4</span>
              Deterministic Matching Algorithm & Data Processing
            </h2>
            <p>
              Match score calculations are strictly deterministic and run in an explainable local evaluation pipeline. Matching evaluates six weighted criteria: Category (25%), Keyword similarity (25%), Color match (15%), Brand token (10%), Campus proximity (15%), and Temporal plausibility (10%).
            </p>
            <p>
              LostLink does not transmit student reports, claims, or personal data to third-party public generative AI APIs or commercial machine-learning corpora.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">5</span>
              Data Retention & Account Deletion Rights
            </h2>
            <p>
              Item reports marked as successfully returned or closed are archived after thirty (30) days. In compliance with institutional record retention laws, custody audit logs (containing verification timestamps and staff approvals) are securely retained for eighteen (18) months for official campus police auditing before automated purging.
            </p>
            <p>
              Students may request deletion of their account profile and non-custodial historical reports at any time by contacting the campus Privacy Officer.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300">6</span>
              Institutional Governance & Privacy Officer Contacts
            </h2>
            <p>
              For privacy inquiries, FERPA record review requests, or reporting security concerns, contact:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1 font-mono">
              <p>Designated Officer: Campus Data Protection & Compliance Officer</p>
              <p>Email: <span className="text-brandTeal-700 dark:text-brandTeal-400 font-semibold">[DATA_PROTECTION_EMAIL]</span></p>
              <p>Institution: <span className="text-slate-600 dark:text-slate-300">[INSTITUTION_NAME]</span></p>
              <p>Office: Division of Information Technology & University Police, <span className="text-slate-600 dark:text-slate-300">[CAMPUS_OFFICE]</span></p>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} LostLink 2.0 • FERPA-Compliant Architecture</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-brandTeal-700 dark:text-brandTeal-400 hover:underline">
              Terms of Service & Property Custody
            </Link>
            <Link href="/help" className="text-slate-600 dark:text-slate-400 hover:underline">
              Handover Verification Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
