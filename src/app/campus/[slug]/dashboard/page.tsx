'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ItemReport } from '@/types/report';
import { MatchResult } from '@/types/match';
import { ClaimRequest } from '@/types/claim';
import { ReportService, MatchingService, ClaimService } from '@/lib/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/Button';
import { DashboardStatsSkeleton } from '@/components/common/LoadingSkeleton';
import { formatDate } from '@/lib/utils';
import {
  PlusCircle,
  FileText,
  Target,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  School,
  Building,
  AlertTriangle,
} from 'lucide-react';

interface CollegeData {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  domain?: string;
  emailDomains: string[];
  city: string;
  state: string;
  country: string;
  primaryColor?: string;
  logoUrl?: string | null;
  campuses?: { id: string; name: string; code: string; lostFoundDeskRoom: string }[];
}

export default function CampusDashboardPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const router = useRouter();
  const { user, activeCollege } = useAuth();
  const { success, error } = useToast();

  const [college, setCollege] = useState<CollegeData | null>(null);
  const [isVerifyingTenant, setIsVerifyingTenant] = useState(true);
  const [tenantViolation, setTenantViolation] = useState<string | null>(null);

  const [myReports, setMyReports] = useState<ItemReport[]>([]);
  const [suggestedMatches, setSuggestedMatches] = useState<MatchResult[]>([]);
  const [pendingClaims, setPendingClaims] = useState<ClaimRequest[]>([]);
  const [returnedCount, setReturnedCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch target campus and enforce tenant boundary
  useEffect(() => {
    if (!slug) return;

    fetch(`/api/colleges/search?slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.colleges && data.colleges.length > 0) {
          const targetCol = data.colleges[0];
          setCollege(targetCol);

          // Tenant boundary check: if user is student, ensure they belong to this college
          if (user && user.role === 'student' && user.collegeId && user.collegeId !== targetCol.id) {
            setTenantViolation(
              `You are assigned to another institutional campus. Tenant isolation restricts cross-campus access.`
            );
            // Redirect to their own verified campus after 1.5s
            const userColSlug = activeCollege?.slug || 'dashboard';
            setTimeout(() => {
              if (userColSlug && userColSlug !== 'dashboard') {
                router.push(`/campus/${userColSlug}/dashboard`);
              } else {
                router.push('/dashboard');
              }
            }, 1500);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsVerifyingTenant(false));
  }, [slug, user?.id, user?.collegeId, activeCollege?.slug, router]);

  // 2. Load campus student data
  useEffect(() => {
    if (tenantViolation) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const allReports = await ReportService.getReports();
        const userReports = allReports.filter((r) => r.reporterId === user?.id);
        setMyReports(userReports);

        const userLost = userReports.filter((r) => r.type === 'lost');
        const allUserMatches: MatchResult[] = [];
        for (const lost of userLost) {
          const matches = await MatchingService.findMatchesForReport(lost.id);
          allUserMatches.push(...matches);
        }
        setSuggestedMatches(allUserMatches.slice(0, 3));

        const claims = await ClaimService.getClaims({ claimantId: user?.id });
        setPendingClaims(claims.filter((c) => c.status !== 'completed' && c.status !== 'rejected'));

        const returned = userReports.filter((r) => r.status === 'returned').length;
        setReturnedCount(returned);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.id, tenantViolation]);

  if (tenantViolation) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tenant Access Restricted</h2>
        <p className="text-xs text-slate-500">{tenantViolation}</p>
        <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium animate-pulse">
          Redirecting to your verified institution...
        </p>
      </div>
    );
  }

  const lostCount = myReports.filter((r) => r.type === 'lost').length;
  const foundCount = myReports.filter((r) => r.type === 'found').length;
  const activeCampusName = college?.name || activeCollege?.name || 'Assigned Campus';

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8 max-w-6xl">
      {/* Institutional Campus Header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl text-white flex items-center justify-center font-black text-2xl shadow-sm overflow-hidden shrink-0"
            style={{ backgroundColor: college?.primaryColor || '#0F766E' }}
          >
            {college?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={college.logoUrl} alt={activeCampusName} className="w-full h-full object-cover" />
            ) : (
              college?.shortName ? college.shortName.charAt(0) : activeCampusName.charAt(0)
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeCampusName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                <CheckCircle2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                Verified Campus
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>{college?.city ? `${college.city}, ${college.state}` : 'Campus Lost & Found Network'}</span>
              <span>•</span>
              <span>Logged in as <strong>{user?.name || 'Student'}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href="/report?type=lost" className="flex-1 md:flex-none">
            <Button variant="destructive" className="w-full flex items-center justify-center gap-2 text-xs">
              <PlusCircle className="w-4 h-4" />
              Report Lost Item
            </Button>
          </Link>
          <Link href="/report?type=found" className="flex-1 md:flex-none">
            <Button variant="primary" className="w-full flex items-center justify-center gap-2 text-xs">
              <PlusCircle className="w-4 h-4" />
              Report Found Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      {isLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="My Lost Reports"
            value={lostCount}
            subtitle="Items awaiting return"
            icon={FileText}
          />
          <StatCard
            title="My Found Reports"
            value={foundCount}
            subtitle="Items reported found"
            icon={CheckCircle2}
          />
          <StatCard
            title="Match Matches"
            value={suggestedMatches.length}
            subtitle="Algorithmic matches"
            icon={Target}
          />
          <StatCard
            title="Items Recovered"
            value={returnedCount}
            subtitle="Successfully returned"
            icon={ShieldCheck}
          />
        </div>
      )}

      {/* Recent Activity */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Reports</h2>
          <Link href="/discover" className="text-xs text-brandTeal-700 dark:text-brandTeal-400 font-semibold hover:underline">
            View Campus Feed →
          </Link>
        </div>

        {myReports.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No active reports filed. If you lost or found something on campus, file a report above.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {myReports.slice(0, 5).map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{r.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {r.type.toUpperCase()} • Reported {formatDate(r.dateOccurred)}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
