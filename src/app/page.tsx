'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ItemReport } from '@/types/report';
import { ReportService } from '@/lib/services/api';
import { ItemCard } from '@/components/items/ItemCard';
import { CATEGORY_LABELS } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  Search,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  School,
  ArrowRight,
  CheckCircle2,
  Lock,
  Building2,
  HelpCircle,
  MapPin,
  Clock,
  Compass,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { activeCollege, allColleges } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentReports, setRecentReports] = useState<ItemReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    ReportService.getReports({ collegeId: activeCollege.id }).then((items) => {
      setRecentReports(items.slice(0, 6));
      setIsLoading(false);
    });
  }, [activeCollege.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/discover');
    }
  };

  const faqs = [
    {
      q: 'How does LostLink verify I am the real owner without seeing my data?',
      a: 'LostLink uses zero-knowledge ownership proofs. When reporting an item, owners state private identifiers (unique scratches, serial snippets, lock screen images) that are hidden from the public directory. Finders or campus custody desks compare these answers during the claim review before authorizing physical handover.',
    },
    {
      q: 'Can students from other campuses view my lost report?',
      a: 'By default, public listings are discoverable across federated partner universities so cross-campus transit losses can be recovered. However, private ownership details and contact info are never exposed, and handovers must take place at official university custody desks.',
    },
    {
      q: 'What happens when I turn in a found item at a campus desk?',
      a: 'The desk records the item with a secure custody tag. You can log it on LostLink and check "Deposited with Official Campus Office". Once the verified owner claims it, the campus desk issues an encrypted 6-digit exchange code to release the item.',
    },
    {
      q: 'Does LostLink use paid or generative AI APIs for matching?',
      a: 'No. Matching uses an explainable deterministic rule-based engine that calculates weighted similarities across Category (25%), Name & Keywords (25%), Color (15%), Brand (10%), Campus Location (15%), and Timeline Plausibility (10%). Every match is transparent and explainable.',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* HERO SECTION */}
      <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brandTeal-50/50 via-slate-50 to-transparent dark:from-brandTeal-950/20 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />
        
        <div className="container mx-auto relative z-10 max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brandTeal-50 dark:bg-brandTeal-950/60 border border-brandTeal-200 dark:border-brandTeal-800 text-xs font-semibold text-brandTeal-800 dark:text-brandTeal-300 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-brandTeal-500" />
            <span>Active on {activeCollege.shortName} & Partner Campuses</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
            Lost something? <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brandTeal-700 via-brandTeal-600 to-brandBlue-600 dark:from-brandTeal-400 dark:to-brandBlue-400">
              Let&apos;s find it together.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The secure, intelligent lost & found network connecting students, faculty, and campus custody desks across universities with deterministic matching and private verification.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto">
            <div className="relative flex items-center shadow-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 focus-within:ring-2 focus-within:ring-brandTeal-600">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search lost & found items across ${activeCollege.shortName}...`}
                className="w-full px-3 py-2 text-sm bg-transparent border-0 focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <Button type="submit" variant="primary" size="md" className="rounded-xl shrink-0">
                Search
              </Button>
            </div>
          </form>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/report/lost">
              <Button size="lg" variant="navy" className="gap-2 shadow-card">
                Report Lost Item
              </Button>
            </Link>
            <Link href="/report/found">
              <Button size="lg" variant="primary" className="gap-2 shadow-card">
                <PlusCircle className="w-4 h-4" />
                Report Found Item
              </Button>
            </Link>
          </div>

          {/* Demonstration Figures Banner */}
          <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">5,070+</p>
              <p className="text-[11px] text-slate-500 font-medium">Demonstration Reports</p>
            </div>
            <div>
              <p className="text-2xl font-black text-brandTeal-700 dark:text-brandTeal-400">78.1%</p>
              <p className="text-[11px] text-slate-500 font-medium">Safe Recovery Rate</p>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">2.4 Days</p>
              <p className="text-[11px] text-slate-500 font-medium">Avg Resolution Time</p>
            </div>
            <div>
              <p className="text-2xl font-black text-brandBlue-600 dark:text-brandBlue-400">3 Campuses</p>
              <p className="text-[11px] text-slate-500 font-medium">Federated In Demo</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            *Demonstration metrics for Cloud Computing Module IV PBL evaluation.
          </p>
        </div>
      </section>

      {/* CATEGORY SHORTCUTS */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Browse by Category</h2>
            <p className="text-xs text-slate-500">Quickly filter common campus belongings</p>
          </div>
          <Link href="/discover" className="text-xs font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:underline flex items-center gap-1">
            All Categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Object.entries(CATEGORY_LABELS).slice(0, 6).map(([key, info]) => (
            <Link
              key={key}
              href={`/discover?category=${key}`}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brandTeal-500 dark:hover:border-brandTeal-600 hover:shadow-subtle transition-all text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-brandTeal-50 dark:group-hover:bg-brandTeal-950/60 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-brandTeal-700 transition-colors mx-auto">
                <Compass className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brandTeal-700 transition-colors">
                {info.label.split('&')[0]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* RECENTLY REPORTED PUBLIC ITEMS */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Recently Reported Belongings
            </h2>
            <p className="text-xs text-slate-500">
              Active reports from {activeCollege.shortName} and connected locations
            </p>
          </div>
          <Link href="/discover">
            <Button size="sm" variant="outline" className="text-xs">
              View Full Catalog <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {recentReports.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentReports.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs">
            No public items currently reported for {activeCollege.shortName}.
          </div>
        )}
      </section>

      {/* HOW LOSTLINK WORKS */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 relative overflow-hidden">
          <div className="max-w-2xl space-y-3 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-brandTeal-400">
              Deterministic Verification Architecture
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              How LostLink Protects Campus Property
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Designed to replace chaotic WhatsApp group posts and fragmented bulletin boards with an accountable, privacy-preserving institutional workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brandTeal-500/20 text-brandTeal-400 flex items-center justify-center font-bold text-base">
                1
              </div>
              <h3 className="text-base font-bold text-white">Report Safely</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Publish safe visual attributes to the public directory while locking identifying details (lockscreens, serial snippets, private stickers) in confidential verification escrow.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brandBlue-500/20 text-brandBlue-400 flex items-center justify-center font-bold text-base">
                2
              </div>
              <h3 className="text-base font-bold text-white">Rule-Based Match Radar</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Our 100-point deterministic engine continuously pairs complementary lost and found reports using weighted token similarity, campus proximity, and time plausibility.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base">
                3
              </div>
              <h3 className="text-base font-bold text-white">Desk Handover with OTP</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Handovers are coordinated at verified campus lost-and-found desks or security offices using 6-digit exchange verification codes and student ID check.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST AND SAFETY */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-brandTeal-700 dark:text-brandTeal-400">
              Trust & Safety Standards
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Zero-Knowledge Verification. No Public Phone Numbers.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Traditional lost-and-found boards expose students to impersonators, phishing calls, and fraud. LostLink isolates ownership answers in zero-knowledge proof challenges verified only by authorized custodians.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Strict Student Domain Authentication</h4>
                  <p className="text-xs text-slate-500">Only verified students and campus staff with active institutional credentials can file ownership claims.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Anti-Self-Approval Safeguards</h4>
                  <p className="text-xs text-slate-500">Finders cannot approve claims on items they themselves reported, preventing fraudulent property acquisition.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Full Custody Audit Logs</h4>
                  <p className="text-xs text-slate-500">Every claim submission, verification note, and handover confirmation is timestamped for campus police audit.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-brandTeal-50 dark:bg-brandTeal-950 flex items-center justify-center text-brandTeal-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Official Campus Custody Hub</h4>
                <p className="text-xs text-slate-500">{activeCollege.name}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Primary Desk: {activeCollege.campuses[0]?.lostFoundOffice.room}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Operating Hours: {activeCollege.campuses[0]?.lostFoundOffice.operatingHours}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>Emergency Custody Dispatch: {activeCollege.campuses[0]?.lostFoundOffice.contactEmail}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/help">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Review Campus Safe Custody Guidelines
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PARTICIPATING INSTITUTIONS */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Participating University Campuses</h2>
          <p className="text-xs text-slate-500">Cross-campus property synchronization enabled across these institutions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {allColleges.map((col) => (
            <div
              key={col.id}
              className={`p-5 rounded-2xl border transition-all ${
                col.id === activeCollege.id
                  ? 'border-brandTeal-600 bg-brandTeal-50/30 dark:bg-brandTeal-950/20 shadow-subtle'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-brandTeal-700 dark:text-brandTeal-300 font-bold text-sm">
                  {col.shortName.charAt(0)}
                </div>
                {col.id === activeCollege.id && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brandTeal-600 text-white">
                    Active Session
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{col.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{col.state}, United States</p>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>{col.campuses.length} Campuses</span>
                <span>{col.totalRecoveries}+ Recoveries</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="container mx-auto px-4 sm:px-6 max-w-3xl">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-500">Understanding LostLink safety, matching, and ownership rules</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-brandTeal-600 shrink-0" />
                {faq.q}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-6 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
