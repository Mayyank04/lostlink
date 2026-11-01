import React from 'react';
import Link from 'next/link';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-3xl space-y-8 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
      <div className="space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
          <AlertCircle className="w-3 h-3" /> Draft Academic Legal Policy — For Institutional Review
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Privacy Policy & Property Data Protection
        </h1>
        <p className="text-slate-400">Last updated: October 2026 • LostLink 2.0 Academic Build</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          1. Zero-Knowledge Information Architecture
        </h2>
        <p>
          LostLink is engineered under privacy-by-design principles. When submitting a lost report, sensitive identifiers (e.g., partial device serial numbers, lockscreen descriptions, hidden pocket contents) are designated as confidential evidence. These fields are strictly isolated from the public directory and public search indexes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          2. Data Collected from Students and Campus Members
        </h2>
        <p>
          To maintain an authentic student community, LostLink collects:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Institutional email address (@edu domain) for SSO identity verification.</li>
          <li>Student full name and university identification number for campus custody pickup verification.</li>
          <li>Item descriptive attributes (category, color, make/brand, campus facility where lost or found).</li>
          <li>Public photographs voluntarily uploaded by reporters.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          3. Institutional Scoping and Access Boundaries
        </h2>
        <p>
          Reports and ownership verification answers are partitioned by university domain. Campus administrators and designated lost & found custodians can review claims originating within their institution. Data is never sold or utilized for targeted third-party advertising.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          4. Regulatory Notice
        </h2>
        <p>
          This document represents draft terms designed for academic evaluation under Cloud Computing Module IV PBL requirements. Formal deployment requires approval from participating university Office of General Counsel and Data Protection Officers.
        </p>
      </section>
    </div>
  );
}

