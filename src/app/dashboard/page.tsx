'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ItemReport } from '@/types/report';
import { MatchResult } from '@/types/match';
import { ClaimRequest } from '@/types/claim';
import { ReportService, MatchingService, ClaimService } from '@/lib/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { MatchScore } from '@/components/matching/MatchScore';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { DashboardStatsSkeleton, TableRowSkeleton } from '@/components/common/LoadingSkeleton';
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
  UserCheck,
  Trash2,
  Edit,
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  FolderOpen,
  GraduationCap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, activeCollege, activeCampus, logout } = useAuth();
  const { success, error } = useToast();

  const [myReports, setMyReports] = useState<ItemReport[]>([]);
  const [suggestedMatches, setSuggestedMatches] = useState<MatchResult[]>([]);
  const [pendingClaims, setPendingClaims] = useState<ClaimRequest[]>([]);
  const [returnedCount, setReturnedCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const allReports = await ReportService.getReports();
      const userReports = allReports.filter((r) => r.reporterId === user?.id);
      setMyReports(userReports);

      // Matches for user's lost reports
      const userLost = userReports.filter((r) => r.type === 'lost');
      const allUserMatches: MatchResult[] = [];
      for (const lost of userLost) {
        const matches = await MatchingService.findMatchesForReport(lost.id);
        allUserMatches.push(...matches);
      }
      setSuggestedMatches(allUserMatches.slice(0, 3));

      // Claims
      const claims = await ClaimService.getClaims({ claimantId: user?.id });
      setPendingClaims(claims.filter((c) => c.status !== 'completed' && c.status !== 'rejected'));

      // Returned count across user's items
      const returned = userReports.filter((r) => r.status === 'returned').length;
      setReturnedCount(returned);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.id, activeCollege.id]);

  const lostCount = myReports.filter((r) => r.type === 'lost').length;
  const foundCount = myReports.filter((r) => r.type === 'found').length;

  const handleCloseReport = async (reportId: string) => {
    try {
      await ReportService.updateReport(reportId, { status: 'closed' });
      success('Report Closed', 'Your report has been marked closed.');
      loadDashboardData();
    } catch (e) {
      error('Error', 'Unable to close report.');
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8 max-w-6xl">
      {/* Incomplete Onboarding Banner */}
      {user && !user.isOnboarded && !user.studentProfile?.isOnboardingDone && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Complete Your Academic Profile
              </h2>
              <p className="text-xs text-slate-500">
                Register your course, enrollment number, department, and section to activate institutional item release permissions.
              </p>
            </div>
          </div>
          <Link href="/onboarding/student">
            <Button size="sm" variant="primary" className="text-xs whitespace-nowrap">
              Complete Profile <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Personalized Greeting & Profile Header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brandTeal-700 text-white flex items-center justify-center font-black text-2xl shadow-sm overflow-hidden">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Welcome back, {user?.name?.split(' ')[0] || 'Student'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Verified Student
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {activeCollege.name}
            </p>
            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{user?.studentProfile?.course || 'B.Tech Computer Science'}</span>
              <span>•</span>
              <span>{user?.studentProfile?.department || user?.department || 'Department of Computer Science'}</span>
              <span>•</span>
              <span className="font-mono">Batch: {user?.studentProfile?.batch || '2023-2027'}</span>
              <span>•</span>
              <span>Year: {user?.studentProfile?.currentYear ? `Year ${user.studentProfile.currentYear}` : 'Year 2'}</span>
              <span>•</span>
              <span>Section: {user?.studentProfile?.section || 'A'}</span>
              <span>•</span>
              <span className="font-mono text-slate-400">ID: {user?.studentProfile?.studentIdNumber || user?.studentIdNumber || 'APX-2027'}</span>
            </div>
          </div>
        </div>

        {/* Quick Report CTAs */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Link href="/report/lost" className="flex-1 md:flex-none">
            <Button size="md" variant="outline" className="w-full text-rose-700 border-rose-200 hover:bg-rose-50 text-xs">
              Report Lost Item
            </Button>
          </Link>
          <Link href="/report/found" className="flex-1 md:flex-none">
            <Button size="md" variant="primary" className="w-full text-xs">
              <PlusCircle className="w-4 h-4 mr-1" />
              Report Found Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Student Campus Navigation Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-subtle flex items-center justify-between gap-1 overflow-x-auto text-xs">
        <div className="flex items-center gap-1 min-w-max">
          <Link
            href="/dashboard"
            className="px-3 py-2 rounded-xl bg-brandTeal-50 dark:bg-brandTeal-950/60 text-brandTeal-700 dark:text-brandTeal-300 font-bold flex items-center gap-1.5"
          >
            <School className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <Link
            href="/report/lost"
            className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-rose-600" />
            Report Lost
          </Link>
          <Link
            href="/report/found"
            className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
            Report Found
          </Link>
          <Link
            href="/discover?type=lost"
            className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-1.5 transition"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            Browse Lost
          </Link>
          <Link
            href="/discover?type=found"
            className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-1.5 transition"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            Browse Found
          </Link>
          <a
            href="#my-reports"
            className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-1.5 transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            My Reports
          </a>
          <Link
            href="/claims"
            className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-1.5 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            My Claims
          </Link>
          <Link
            href="/notifications"
            className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-1.5 transition"
          >
            <Bell className="w-3.5 h-3.5 text-slate-400" />
            Notifications
          </Link>
          <Link
            href="/profile"
            className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-1.5 transition"
          >
            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
            My Profile
          </Link>
        </div>

        <button
          onClick={() => logout()}
          className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium flex items-center gap-1.5 transition shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>

      {/* Dynamic Counter Metrics from Active Data Source */}
      {isLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="My Lost Reports"
            value={lostCount}
            subtitle="Currently active"
            icon={FileText}
            variant="amber"
          />
          <StatCard
            title="Items I Found"
            value={foundCount}
            subtitle="In safe custody"
            icon={ShieldCheck}
            variant="teal"
          />
          <StatCard
            title="Potential Matches"
            value={suggestedMatches.length}
            subtitle="Algorithmic radar"
            icon={Target}
            variant="blue"
          />
          <StatCard
            title="Returned to Me"
            value={returnedCount}
            subtitle="Safe handovers"
            icon={CheckCircle2}
            variant="emerald"
          />
        </div>
      )}

      {/* Grid: Suggested Matches & Pending Claims */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Suggested Matches Section */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-brandTeal-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Suggested Matches for You
              </h2>
            </div>
            <Link href="/matches" className="text-xs font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:underline">
              View All Matches →
            </Link>
          </div>

          {suggestedMatches.length > 0 ? (
            <div className="space-y-3">
              {suggestedMatches.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-subtle flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <MatchScore score={m.totalScore} confidenceTier={m.confidenceTier} size="sm" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {m.foundReport.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Found at {m.foundReport.locationBuilding} • {formatDate(m.foundReport.dateOccurred)}
                      </p>
                    </div>
                  </div>

                  <Link href={`/items/${m.foundReport.id}`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      Inspect
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
              No potential matches detected for your lost items yet. We will notify you when a match appears.
            </div>
          )}
        </div>

        {/* Pending Claims Section */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Active Verification Claims
              </h2>
            </div>
            <Link href="/claims" className="text-xs font-semibold text-brandTeal-700 dark:text-brandTeal-400 hover:underline">
              All Claims →
            </Link>
          </div>

          {pendingClaims.length > 0 ? (
            <div className="space-y-3">
              {pendingClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-subtle space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-500">
                      {claim.referenceNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 capitalize">
                      {claim.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {claim.report?.title}
                  </h4>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Submitted {formatDate(claim.createdAt)}
                    </span>
                    <Link href={`/claims/${claim.id}`}>
                      <span className="text-xs font-semibold text-brandTeal-700 hover:underline">
                        Track Status →
                      </span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
              No active claims in progress.
            </div>
          )}
        </div>
      </div>

      {/* My Reports Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Active Listings</h2>
            <p className="text-xs text-slate-500">Manage and track your reported lost & found items</p>
          </div>
          <Link href="/discover">
            <Button size="sm" variant="outline" className="text-xs">
              View Public Catalog
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <TableRowSkeleton columns={7} rows={4} />
        ) : myReports.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Reference</th>
                    <th className="p-4">Item Details</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {myReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-4 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {report.referenceNumber}
                      </td>
                      <td className="p-4">
                        <Link href={`/items/${report.id}`} className="font-bold text-slate-900 dark:text-white hover:text-brandTeal-600 line-clamp-1">
                          {report.title}
                        </Link>
                        <span className="text-[11px] text-slate-400 capitalize">{report.category.replace('_', ' ')}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                            report.type === 'lost'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                          }`}
                        >
                          {report.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={report.status} showDot={true} />
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        {report.locationBuilding}
                      </td>
                      <td className="p-4 text-slate-500">
                        {formatDate(report.dateOccurred)}
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <Link href={`/items/${report.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                            View
                          </Button>
                        </Link>
                        {report.status !== 'closed' && report.status !== 'returned' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCloseReport(report.id)}
                            className="h-7 px-2 text-[11px] text-slate-500 hover:text-rose-600"
                          >
                            Close
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No Items Reported Yet"
            description="You have not published any lost or found items. Submit a report to get started."
            actionLabel="Report Lost Item"
            onAction={() => (window.location.href = '/report/lost')}
          />
        )}
      </div>
    </div>
  );
}

