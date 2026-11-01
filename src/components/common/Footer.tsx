import React from 'react';
import Link from 'next/link';
import { School, ShieldCheck, Heart, ExternalLink } from 'lucide-react';
import { MOCK_COLLEGES } from '@/data/colleges';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brandTeal-700 text-white flex items-center justify-center font-black text-sm">
                L
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                LostLink <span className="text-brandTeal-600 text-xs">2.0</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              &ldquo;Lost something? Let&apos;s find it together.&rdquo;
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              Smart multi-college lost & found ecosystem uniting campus security desks, student unions, and peer finders through explainable verification.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-brandTeal-700 dark:text-brandTeal-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero-knowledge ownership privacy</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Platform
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/discover" className="hover:text-brandTeal-600 transition-colors">
                  Public Item Directory
                </Link>
              </li>
              <li>
                <Link href="/matches" className="hover:text-brandTeal-600 transition-colors">
                  Automated Match Radar
                </Link>
              </li>
              <li>
                <Link href="/claims" className="hover:text-brandTeal-600 transition-colors">
                  Ownership Verification Claims
                </Link>
              </li>
              <li>
                <Link href="/report/lost" className="hover:text-brandTeal-600 transition-colors">
                  Report Lost Belonging
                </Link>
              </li>
              <li>
                <Link href="/report/found" className="hover:text-brandTeal-600 transition-colors">
                  Report Found Property
                </Link>
              </li>
            </ul>
          </div>

          {/* Participating Institutions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Participating Colleges
            </h4>
            <ul className="space-y-1.5">
              {MOCK_COLLEGES.map((college) => (
                <li key={college.id} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <School className="w-3 h-3 text-brandTeal-600 shrink-0" />
                  <span className="truncate">{college.name}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-slate-400 mt-2">
              Interested in onboarding your campus?{' '}
              <Link href="/contact" className="text-brandTeal-600 hover:underline">
                Contact Office
              </Link>
            </p>
          </div>

          {/* Legal & Cloud PBL Project Info */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Governance & Policies
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/privacy" className="hover:text-brandTeal-600 transition-colors">
                  Privacy Policy & Student Data
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brandTeal-600 transition-colors">
                  Terms of Property Custody
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-brandTeal-600 transition-colors">
                  Help Center & Safe Handover Guide
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-brandTeal-600 transition-colors">
                  About LostLink Project
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brandTeal-600 transition-colors">
                  Campus Security Dispatch
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Academic PBL Notice & Disclaimer */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>
            Cloud Computing Module IV PBL Project. Multi-college architecture with hybrid-cloud Kubernetes backend integration readiness.
          </p>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} LostLink 2.0. All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-slate-500">Draft Academic Demonstration Build</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
