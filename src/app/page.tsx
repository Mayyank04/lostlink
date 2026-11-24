'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ItemReport } from '@/types/report';
import { getCollegeShortName, getCollegeInitial } from '@/types/college';
import { ReportService } from '@/lib/services/api';
import { ItemCard } from '@/components/items/ItemCard';
import { CATEGORY_LABELS } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  Search,
  PlusCircle,
  ShieldCheck,
  Target,
  School,
  ArrowRight,
  Lock,
  Building2,
  HelpCircle,
  MapPin,
  Clock,
  Compass,
  CheckCircle2,
  SlidersHorizontal,
  KeyRound,
  FileCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface DemoScenario {
  id: string;
  title: string;
  category: string;
  lostReport: {
    title: string;
    location: string;
    date: string;
    color: string;
    brand: string;
    publicDescription: string;
    privateIdentifier: string;
  };
  foundReport: {
    title: string;
    location: string;
    date: string;
    color: string;
    brand: string;
    custodyOffice: string;
  };
  scores: {
    category: number;
    keywords: number;
    color: number;
    brand: number;
    location: number;
    timeline: number;
  };
  demoCode: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'macbook',
    title: 'Space Grey MacBook Air M2',
    category: 'electronics',
    lostReport: {
      title: 'Space Grey MacBook Air M2 13-inch',
      location: 'Engineering Library, 2nd Floor Study Cubicle',
      date: 'Yesterday, 4:15 PM',
      color: 'Space Grey',
      brand: 'Apple',
      publicDescription: 'Left on study desk in a dark grey felt sleeve with black USB-C cable.',
      privateIdentifier: 'Engraved initials "MLG" near hinge and lockscreen displays photo of black labrador.',
    },
    foundReport: {
      title: 'Found Apple Laptop in Dark Sleeve',
      location: 'Engineering Library Information Desk',
      date: 'Yesterday, 5:30 PM',
      color: 'Space Grey',
      brand: 'Apple',
      custodyOffice: 'Deposited at Engineering Library Custody Hub',
    },
    scores: {
      category: 25,
      keywords: 24,
      color: 15,
      brand: 10,
      location: 15,
      timeline: 10,
    },
    demoCode: '849-204',
  },
  {
    id: 'flask',
    title: 'Navy Blue Hydro Flask 32oz',
    category: 'water_bottles',
    lostReport: {
      title: 'Navy Blue Hydro Flask 32oz Wide Mouth',
      location: 'Student Union Food Court East Entrance',
      date: '2 days ago, 1:20 PM',
      color: 'Navy Blue',
      brand: 'Hydro Flask',
      publicDescription: 'Navy bottle with black flex cap and slight dent on bottom base rim.',
      privateIdentifier: 'Contains outdoor national park stickers: Yosemite Half Dome and Zion National Park.',
    },
    foundReport: {
      title: 'Recovered Blue Water Bottle',
      location: 'Student Union Info Desk',
      date: '2 days ago, 2:00 PM',
      color: 'Navy Blue',
      brand: 'Hydro Flask',
      custodyOffice: 'Deposited at Student Union Custody Desk',
    },
    scores: {
      category: 25,
      keywords: 22,
      color: 15,
      brand: 10,
      location: 15,
      timeline: 9,
    },
    demoCode: '512-789',
  },
  {
    id: 'wallet',
    title: 'Black Leather Student Wallet',
    category: 'accessories',
    lostReport: {
      title: 'Black Leather Bifold Wallet',
      location: 'Science Hall Lecture Theatre 101',
      date: 'Today, 10:45 AM',
      color: 'Black',
      brand: 'Fossil',
      publicDescription: 'Black leather bifold wallet with student transit pass visible in front pocket.',
      privateIdentifier: 'Student ID card ending in digits 4920 and a small silver dormitory locker key.',
    },
    foundReport: {
      title: 'Found Black Leather Wallet',
      location: 'Campus Security Main Office',
      date: 'Today, 11:30 AM',
      color: 'Black',
      brand: 'Fossil',
      custodyOffice: 'Deposited with Campus Police Dispatch',
    },
    scores: {
      category: 25,
      keywords: 23,
      color: 15,
      brand: 10,
      location: 14,
      timeline: 10,
    },
    demoCode: '903-415',
  },
];

export default function HomePage() {
  const router = useRouter();
  const { activeCollege, allColleges } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentReports, setRecentReports] = useState<ItemReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Interactive Demonstration State
  const [activeScenarioId, setActiveScenarioId] = useState<string>('macbook');
  const [activeDemoTab, setActiveDemoTab] = useState<'radar' | 'proof' | 'handover'>('radar');
  const [handoverInputCode, setHandoverInputCode] = useState('');
  const [handoverVerified, setHandoverVerified] = useState(false);
  const [custodianApproved, setCustodianApproved] = useState(false);

  const scenario = DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) || DEMO_SCENARIOS[0];
  const totalScore =
    scenario.scores.category +
    scenario.scores.keywords +
    scenario.scores.color +
    scenario.scores.brand +
    scenario.scores.location +
    scenario.scores.timeline;

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

  const handleTestHandover = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = handoverInputCode.replace(/[^0-9]/g, '');
    const cleanDemo = scenario.demoCode.replace(/[^0-9]/g, '');
    if (cleanInput === cleanDemo) {
      setHandoverVerified(true);
    } else {
      setHandoverVerified(false);
    }
  };

  const resetHandoverDemo = () => {
    setHandoverInputCode('');
    setHandoverVerified(false);
    setCustodianApproved(false);
  };

  const faqs = [
    {
      q: 'How does LostLink verify ownership without exposing private answers to the public?',
      a: 'LostLink isolates sensitive attributes (such as lockscreen images, engravings, concealed pocket items, or serial number fragments) in a confidential verification escrow. Finders and the general public see only high-level visual descriptions. Only authorized campus desk operators or custodians evaluate proof answers during formal claim reviews.',
    },
    {
      q: 'Can students from connected campuses find items lost in transit?',
      a: 'Yes. Public listings are discoverable across federated campus locations so items lost on inter-campus shuttles or cross-institution events can be recovered. However, private ownership details remain hidden and all handovers must be processed through an authorized campus custody desk.',
    },
    {
      q: 'What occurs when an item is turned in to an official campus desk?',
      a: 'The desk records the item with an institutional tracking number and marks it as held in official custody. When a verified claimant is approved, the platform issues a single-use 6-digit exchange verification code that must be presented in person to release the property.',
    },
    {
      q: 'How does the deterministic match radar calculate compatibility?',
      a: 'The engine evaluates six transparent weighted factors: Category (25%), Keywords (25%), Color (15%), Brand (10%), Campus Location (15%), and Timeline Plausibility (10%). Match scores above 80% generate priority notifications for affected students.',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-16 bg-slate-50 dark:bg-slate-950">
      
      {/* HERO SECTION */}
      <section className="pt-12 sm:pt-20 pb-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          
          {/* Active Campus Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-brandTeal-600 animate-pulse" />
            <span>Active Campus: {getCollegeShortName(activeCollege)}</span>
            <span className="text-slate-400">•</span>
            <span className="text-brandTeal-700 dark:text-brandTeal-400 font-mono text-[11px]">Federated Custody Desk Active</span>
          </div>

          {/* Headline - Solid Typography, Zero Clip-text Gradient */}
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.08]">
            Lost something on campus? <br className="hidden sm:inline" />
            Let&apos;s find and recover it together.
          </h1>

          {/* Subtitle - Plain, Confident Product Prose */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The institutional lost and found platform for university campuses. Secure zero-knowledge ownership verification, deterministic matching, and official custody desk handovers.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto">
            <div className="relative flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2 shadow-sm focus-within:border-brandTeal-600 focus-within:ring-2 focus-within:ring-brandTeal-600/20">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search lost or found items across ${getCollegeShortName(activeCollege)}...`}
                className="w-full px-3 py-2 text-sm bg-transparent border-0 focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <Button type="submit" variant="primary" size="md" className="rounded-lg shrink-0">
                Search Catalog
              </Button>
            </div>
          </form>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/report/lost">
              <Button size="lg" variant="navy" className="gap-2 rounded-lg shadow-xs font-semibold">
                Report Lost Belonging
              </Button>
            </Link>
            <Link href="/report/found">
              <Button size="lg" variant="primary" className="gap-2 rounded-lg shadow-xs font-semibold">
                <PlusCircle className="w-4 h-4" />
                Report Discovered Property
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="gap-2 rounded-lg shadow-xs font-semibold border-slate-300 dark:border-slate-700">
                Student Campus Sign In
              </Button>
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            First time using LostLink on your campus?{' '}
            <Link href="/register" className="font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:underline">
              Register Student Account
            </Link>
          </p>

          {/* System Capabilities Ribbon */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-900 dark:text-white">Deterministic Scoring</p>
              <p className="text-[11px] text-slate-500 mt-0.5">6-factor rule correlation</p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-brandTeal-700 dark:text-brandTeal-400">Zero-Knowledge Escrow</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Private answers stay locked</p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-900 dark:text-white">6-Digit Code Exchange</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Verified desk handovers</p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-900 dark:text-white">Multi-Campus Federation</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Synchronized transit routes</p>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE PRODUCT DEMONSTRATION SECTION */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-sm space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-brandTeal-50 dark:bg-brandTeal-950/60 text-brandTeal-800 dark:text-brandTeal-300 text-xs font-semibold mb-2">
                <Target className="w-3.5 h-3.5" />
                <span>Interactive System Demonstration • Live In-Memory Simulation</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Test the Campus Recovery Workflow
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Experience how LostLink pairs items, protects private identifiers, and authorizes desk handovers.
              </p>
            </div>

            {/* Scenario Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">Scenario:</span>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-800/50">
                {DEMO_SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveScenarioId(s.id);
                      resetHandoverDemo();
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeScenarioId === s.id
                        ? 'bg-white dark:bg-slate-900 text-brandTeal-700 dark:text-brandTeal-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {s.title.split(' ')[0]} {s.title.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Workflow Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
            <button
              onClick={() => setActiveDemoTab('radar')}
              className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
                activeDemoTab === 'radar'
                  ? 'border-brandTeal-700 text-brandTeal-700 dark:border-brandTeal-400 dark:text-brandTeal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>1. Deterministic Match Radar ({totalScore}%)</span>
            </button>

            <button
              onClick={() => setActiveDemoTab('proof')}
              className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
                activeDemoTab === 'proof'
                  ? 'border-brandTeal-700 text-brandTeal-700 dark:border-brandTeal-400 dark:text-brandTeal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>2. Zero-Knowledge Escrow Proof</span>
            </button>

            <button
              onClick={() => setActiveDemoTab('handover')}
              className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
                activeDemoTab === 'handover'
                  ? 'border-brandTeal-700 text-brandTeal-700 dark:border-brandTeal-400 dark:text-brandTeal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>3. Handover Code Verification</span>
            </button>
          </div>

          {/* TAB 1: MATCH RADAR */}
          {activeDemoTab === 'radar' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left: Lost Report */}
                <div className="p-5 rounded-xl border border-rose-200 dark:border-rose-950/60 bg-rose-50/40 dark:bg-rose-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded">
                      Lost Report Declaration
                    </span>
                    <span className="text-xs font-mono text-slate-400">LOST-{scenario.id.toUpperCase()}-01</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{scenario.lostReport.title}</h3>
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-800 dark:text-slate-200">Location:</strong> {scenario.lostReport.location}</p>
                    <p><strong className="text-slate-800 dark:text-slate-200">Reported:</strong> {scenario.lostReport.date}</p>
                    <p><strong className="text-slate-800 dark:text-slate-200">Color / Brand:</strong> {scenario.lostReport.color} • {scenario.lostReport.brand}</p>
                    <p className="text-slate-500 dark:text-slate-400 pt-1 border-t border-rose-200/50 dark:border-rose-900/30">
                      &quot;{scenario.lostReport.publicDescription}&quot;
                    </p>
                  </div>
                </div>

                {/* Right: Found Candidate */}
                <div className="p-5 rounded-xl border border-teal-200 dark:border-teal-950/60 bg-teal-50/40 dark:bg-teal-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brandTeal-700 dark:text-brandTeal-300 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded">
                      Found Property Surrender
                    </span>
                    <span className="text-xs font-mono text-slate-400">FND-{scenario.id.toUpperCase()}-02</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{scenario.foundReport.title}</h3>
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-800 dark:text-slate-200">Custody Desk:</strong> {scenario.foundReport.location}</p>
                    <p><strong className="text-slate-800 dark:text-slate-200">Turned In:</strong> {scenario.foundReport.date}</p>
                    <p><strong className="text-slate-800 dark:text-slate-200">Color / Brand:</strong> {scenario.foundReport.color} • {scenario.foundReport.brand}</p>
                    <p className="text-slate-500 dark:text-slate-400 pt-1 border-t border-teal-200/50 dark:border-teal-900/30">
                      Status: {scenario.foundReport.custodyOffice}
                    </p>
                  </div>
                </div>
              </div>

              {/* 6-Factor Calculation Breakdown */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Explainable 6-Factor Algorithmic Score Breakdown
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Calculated locally without external generative AI APIs. Minimum 80% required for high-priority notification.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-brandTeal-700 dark:text-brandTeal-400">
                      {totalScore}%
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                      Strong Match
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-[11px] text-slate-500 font-medium">Category (25%)</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{scenario.scores.category}/25</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Exact match</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-[11px] text-slate-500 font-medium">Keywords (25%)</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{scenario.scores.keywords}/25</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Tokens aligned</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-[11px] text-slate-500 font-medium">Color (15%)</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{scenario.scores.color}/15</p>
                    <p className="text-[10px] text-emerald-600 font-medium">{scenario.lostReport.color}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-[11px] text-slate-500 font-medium">Brand (10%)</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{scenario.scores.brand}/10</p>
                    <p className="text-[10px] text-emerald-600 font-medium">{scenario.lostReport.brand}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-[11px] text-slate-500 font-medium">Location (15%)</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{scenario.scores.location}/15</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Same campus</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-[11px] text-slate-500 font-medium">Timeline (10%)</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{scenario.scores.timeline}/10</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Found after loss</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ZERO-KNOWLEDGE ESCROW */}
          {activeDemoTab === 'proof' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-brandTeal-700 dark:text-brandTeal-400">
                  <Lock className="w-4 h-4" />
                  <span>How Zero-Knowledge Ownership Protection Operates</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  When a claimant files a claim, they submit confidential answers to verify genuine ownership. These answers are isolated in verification escrow: public users and finders cannot view them, preventing opportunistic theft.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Public View */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Public Directory View</h4>
                    <span className="text-[10px] font-medium text-slate-400">Visible to Campus</span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <p><strong className="text-slate-700 dark:text-slate-300">Item:</strong> {scenario.title}</p>
                    <p><strong className="text-slate-700 dark:text-slate-300">Category:</strong> {scenario.category}</p>
                    <p><strong className="text-slate-700 dark:text-slate-300">Location:</strong> {scenario.foundReport.location}</p>
                    <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-500 italic">
                      Private identification details are concealed to prevent false claims.
                    </div>
                  </div>
                </div>

                {/* Custody Desk Verification */}
                <div className="p-5 rounded-xl border border-brandTeal-200 dark:border-brandTeal-900/60 bg-brandTeal-50/30 dark:bg-brandTeal-950/20 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-brandTeal-100 dark:border-brandTeal-900/40">
                    <h4 className="text-xs font-bold text-brandTeal-900 dark:text-brandTeal-200">
                      Custody Desk Review Escrow
                    </h4>
                    <span className="text-[10px] font-bold text-brandTeal-700 dark:text-brandTeal-300">
                      Restricted Access
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Confidential Ownership Answer Submitted:
                    </p>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-brandTeal-200 dark:border-brandTeal-900/60 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      {scenario.lostReport.privateIdentifier}
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {custodianApproved ? 'Status: Approved by Desk Attendant' : 'Awaiting Custodian Verification'}
                      </span>
                      <Button
                        size="sm"
                        variant={custodianApproved ? 'outline' : 'primary'}
                        onClick={() => setCustodianApproved(!custodianApproved)}
                        className="text-xs rounded-md"
                      >
                        {custodianApproved ? 'Revoke Approval' : 'Simulate Desk Approval'}
                      </Button>
                    </div>

                    {custodianApproved && (
                      <div className="p-2.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Ownership corroborated. 6-digit exchange code issued to claimant.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HANDOVER OTP */}
          {activeDemoTab === 'handover' && (
            <div className="max-w-2xl mx-auto space-y-6 py-2">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-center space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Simulate Desk Handover Verification
                </h4>
                <p className="text-xs text-slate-500">
                  When the claimant arrives at the custody office, they provide this single-use 6-digit exchange code to release the property.
                </p>
                <div className="pt-2">
                  <span className="inline-block px-4 py-2 rounded-lg bg-slate-900 text-white font-mono font-bold text-lg tracking-widest shadow-xs">
                    {scenario.demoCode}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Claimant&apos;s Issued Handover Token</p>
                </div>
              </div>

              <form onSubmit={handleTestHandover} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Desk Attendant Handover Input:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={handoverInputCode}
                      onChange={(e) => setHandoverInputCode(e.target.value)}
                      placeholder={`Enter code (e.g. ${scenario.demoCode})`}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brandTeal-600"
                    />
                    <Button type="submit" variant="primary" size="md" className="rounded-lg shrink-0">
                      Validate Code
                    </Button>
                  </div>
                </div>

                {handoverVerified && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Physical Custody Transfer Validated</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      The code matches the claim session. Property liability has been successfully concluded and recorded in the university custody ledger.
                    </p>
                    <div className="pt-1 flex gap-2">
                      <Button size="sm" variant="outline" onClick={resetHandoverDemo} className="text-xs">
                        Reset Handover Test
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </section>

      {/* CATEGORY SHORTCUTS */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Browse by Category</h2>
            <p className="text-xs text-slate-500">Filter common campus belongings across departments</p>
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
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brandTeal-600 dark:hover:border-brandTeal-600 transition-colors text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-brandTeal-50 dark:group-hover:bg-brandTeal-950/60 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-brandTeal-700 transition-colors mx-auto">
                <Compass className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brandTeal-700 transition-colors">
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
              Active reports from {getCollegeShortName(activeCollege)} and federated locations
            </p>
          </div>
          <Link href="/discover">
            <Button size="sm" variant="outline" className="text-xs rounded-lg">
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
          <div className="p-8 text-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs">
            No public items currently reported for {getCollegeShortName(activeCollege)}.
          </div>
        )}
      </section>

      {/* 4-PHASE INSTITUTIONAL RECOVERY PIPELINE */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-12 space-y-8">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brandTeal-400">
              Operational Recovery Protocol
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Four-Phase Institutional Custody Workflow
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              LostLink replaces disorganized chat messages and lost-property bins with a deterministic, verified university chain of custody.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-brandTeal-500/20 text-brandTeal-400 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-sm font-bold text-white">Declare Report</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Public visual tags are cataloged while private identifiers (serial snippets, lockscreens) remain sealed in zero-knowledge escrow.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-brandTeal-500/20 text-brandTeal-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-sm font-bold text-white">Rule Correlation</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The local 6-factor similarity engine computes compatibility across category, text, color, brand, campus location, and time.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-brandTeal-500/20 text-brandTeal-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-sm font-bold text-white">Desk Adjudication</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Campus custody attendants compare claimant answers against sealed escrow answers to confirm rightful ownership.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-brandTeal-500/20 text-brandTeal-400 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h3 className="text-sm font-bold text-white">Code Exchange</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Physical property release is authenticated in person at the campus desk using a single-use 6-digit verification code.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* TRUST AND SAFETY SPECIFICATIONS */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-brandTeal-700 dark:text-brandTeal-400">
              Institutional Safeguards
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Zero-Knowledge Verification. No Public Phone Numbers.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Traditional lost-and-found bulletin boards expose student phone numbers and photos, enabling impersonation and harassment. LostLink isolates ownership answers in zero-knowledge proof challenges evaluated only by authorized campus custodians.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-brandTeal-700 dark:text-brandTeal-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Strict Student Domain Authentication</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Only verified students and campus staff with active institutional credentials can file ownership claims.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-brandTeal-700 dark:text-brandTeal-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Anti-Self-Approval Safeguards</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Finders cannot approve claims on items they reported, preventing fraudulent property acquisition.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-brandTeal-700 dark:text-brandTeal-400 shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Tamper-Evident Custody Logs</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Every claim submission, proof answer review, and handover confirmation is timestamped for campus security audit.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Campus Custody Desk Information */}
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-brandTeal-50 dark:bg-brandTeal-950 flex items-center justify-center text-brandTeal-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Primary Campus Custody Desk</h4>
                <p className="text-xs text-slate-500">{activeCollege.name}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Primary Desk: {activeCollege.campuses[0]?.lostFoundOffice.room}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Operating Hours: {activeCollege.campuses[0]?.lostFoundOffice.operatingHours}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Custodian Contact: {activeCollege.campuses[0]?.lostFoundOffice.contactEmail}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/help">
                <Button size="sm" variant="outline" className="w-full text-xs rounded-lg">
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
              className={`p-5 rounded-xl border transition-colors ${
                col.id === activeCollege.id
                  ? 'border-brandTeal-700 bg-brandTeal-50/20 dark:bg-brandTeal-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-brandTeal-700 dark:text-brandTeal-300 font-bold text-sm">
                  {getCollegeInitial(col)}
                </div>
                {col.id === activeCollege.id && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brandTeal-700 text-white">
                    Active Session
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{col.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{col.state || 'Federated'}, United States</p>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>{(col.campuses || []).length} Campuses</span>
                <span>{col.totalRecoveries || 0} Registered Recoveries</span>
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
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-brandTeal-700 dark:text-brandTeal-400 shrink-0" />
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
