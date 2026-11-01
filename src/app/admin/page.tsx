'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ItemReport } from '@/types/report';
import { ClaimRequest } from '@/types/claim';
import { CollegeAdminAnalytics } from '@/types/analytics';
import { ReportService, ClaimService, AnalyticsService } from '@/lib/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { CategoryBreakdownChart, MonthlyRecoveryChart } from '@/components/analytics/AnalyticsCharts';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import {
  Building2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Download,
  Users,
  MapPin,
  Clock,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Eye,
  Sliders,
} from 'lucide-react';

export default function CollegeAdminPage() {
  const { user, role, activeCollege, activeCampus } = useAuth();
  const { success, info, error } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'claims' | 'locations' | 'export'>('overview');
  const [reports, setReports] = useState<ItemReport[]>([]);
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [analytics, setAnalytics] = useState<CollegeAdminAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const rep = await ReportService.getReports({ collegeId: activeCollege.id });
      setReports(rep);

      const clm = await ClaimService.getClaims({ collegeId: activeCollege.id });
      setClaims(clm);

      const stats = await AnalyticsService.getCollegeAnalytics(activeCollege.id);
      setAnalytics(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [activeCollege.id]);

  const handleModeration = async (reportId: string, action: 'approve' | 'flag' | 'remove') => {
    try {
      if (action === 'remove') {
        await ReportService.deleteReport(reportId);
        success('Listing Removed', 'The report was purged from the active college registry.');
      } else {
        await ReportService.updateReport(reportId, {
          moderationStatus: action === 'approve' ? 'approved' : 'flagged',
        });
        success('Moderation Updated', `Status changed to ${action}.`);
      }
      loadAdminData();
    } catch (e) {
      error('Error', 'Unable to execute moderation action.');
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ reports, claims }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${activeCollege.shortName}_lostlink_audit_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    success('Data Exported', 'University property register downloaded in JSON format.');
  };

  const filteredReports = reports.filter((r) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.referenceNumber.toLowerCase().includes(q) ||
      r.locationBuilding.toLowerCase().includes(q) ||
      r.reporterName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8 max-w-6xl">
      {/* College Admin Header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brandTeal-700 text-white flex items-center justify-center font-bold text-xl shadow-sm">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeCollege.shortName} Custody & Security Portal
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Institutional Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Campus Property Administration • {activeCollege.campuses.length} Campuses Scoped
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExportJSON} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Data (JSON)
          </Button>
          <Button size="sm" variant="primary" onClick={loadAdminData} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Analytics Overview
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'reports'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Report Moderation ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'claims'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Claims Review ({claims.length})
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'locations'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Campus Facilities
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Lost Reports"
              value={analytics.totalLostReports}
              subtitle="Registered students"
              icon={Building2}
              variant="amber"
            />
            <StatCard
              title="Total Found Reports"
              value={analytics.totalFoundReports}
              subtitle="Desk & peer custody"
              icon={ShieldCheck}
              variant="teal"
            />
            <StatCard
              title="Verified Recoveries"
              value={analytics.successfulReturnsCount}
              subtitle="Demonstration figures"
              icon={CheckCircle2}
              variant="emerald"
            />
            <StatCard
              title="Safe Recovery Rate"
              value={`${analytics.recoveryRatePercent}%`}
              subtitle="Avg 2.4 days to return"
              icon={Users}
              variant="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Recovery Performance
              </h3>
              <p className="text-xs text-slate-500">Reported belongings vs safely returned items</p>
              <MonthlyRecoveryChart data={analytics.monthlyTrends} />
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Belongings Category Breakdown
              </h3>
              <p className="text-xs text-slate-500">Lost vs found ratios across main item types</p>
              <CategoryBreakdownChart data={analytics.categoryStats} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REPORT MODERATION TABLE */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter by ref, title, reporter..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Reference</th>
                    <th className="p-3.5">Title & Category</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Reporter</th>
                    <th className="p-3.5">Facility</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredReports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {r.referenceNumber}
                      </td>
                      <td className="p-3.5">
                        <Link href={`/items/${r.id}`} className="font-bold text-slate-900 dark:text-white hover:underline line-clamp-1">
                          {r.title}
                        </Link>
                        <span className="text-[11px] text-slate-400 capitalize">{r.category.replace('_', ' ')}</span>
                      </td>
                      <td className="p-3.5 uppercase font-bold text-[10px]">
                        <span className={r.type === 'lost' ? 'text-rose-600' : 'text-teal-600'}>
                          {r.type}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        <p className="font-semibold">{r.reporterName}</p>
                        <p className="text-[10px] text-slate-400">{r.reporterEmail}</p>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {r.locationBuilding}
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={r.status} showDot={false} />
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        <Link href={`/items/${r.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModeration(r.id, 'flag')}
                          className="h-7 px-2 text-[11px] text-amber-600"
                        >
                          Flag
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleModeration(r.id, 'remove')}
                          className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CLAIMS REVIEW */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Claim Ref</th>
                    <th className="p-3.5">Target Item</th>
                    <th className="p-3.5">Claimant</th>
                    <th className="p-3.5">Finder</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Timeline Events</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {claims.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {c.referenceNumber}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {c.report?.title}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{c.claimantName}</p>
                        <p className="text-[10px] text-slate-400">{c.claimantStudentId}</p>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {c.finderName}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold uppercase text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {c.timeline.length} logged
                      </td>
                      <td className="p-3.5 text-right">
                        <Link href={`/claims/${c.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Inspect Claim
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CAMPUS LOCATIONS */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeCollege.campuses.map((camp) => (
              <div
                key={camp.id}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-subtle space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{camp.name}</h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{camp.code}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <p className="font-bold text-brandTeal-700 dark:text-brandTeal-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Official Custody Desk: {camp.lostFoundOffice.room}
                  </p>
                  <p className="text-slate-500">Dispatch: {camp.lostFoundOffice.contactEmail}</p>
                  <p className="text-slate-500">Hours: {camp.lostFoundOffice.operatingHours}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Registered Facilities ({camp.locations.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {camp.locations.map((loc) => (
                      <div
                        key={loc.id}
                        className="p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{loc.name}</span>
                        {loc.hasLostFoundDesk && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                            Desk
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

