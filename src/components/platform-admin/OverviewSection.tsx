'use client';

import React from 'react';
import {
  Building2,
  Users,
  FileText,
  ShieldCheck,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Server,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface OverviewSectionProps {
  overviewData: any;
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateSection: (section: any) => void;
}

export function OverviewSection({
  overviewData,
  isLoading,
  onRefresh,
  onNavigateSection,
}: OverviewSectionProps) {
  if (isLoading && !overviewData) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Loading real-time platform metrics...
      </div>
    );
  }

  const stats = overviewData?.stats || {
    totalColleges: 0,
    activeColleges: 0,
    pendingColleges: 0,
    registeredStudents: 0,
    verifiedStudents: 0,
    lostReports: 0,
    foundReports: 0,
    activeMatches: 0,
    pendingClaims: 0,
    returnedItems: 0,
    suspendedAccounts: 0,
    totalWorkers: 0,
    activeWorkers: 0,
    recoveryRate: 0,
  };

  const cards = [
    {
      title: 'Federated Colleges',
      value: stats.totalColleges,
      sub: `${stats.activeColleges} active • ${stats.pendingColleges} pending`,
      icon: Building2,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40',
      action: () => onNavigateSection('colleges'),
    },
    {
      title: 'Registered Students',
      value: stats.registeredStudents.toLocaleString(),
      sub: `${stats.verifiedStudents} institutional memberships`,
      icon: Users,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
      action: () => onNavigateSection('students'),
    },
    {
      title: 'Active Reports',
      value: (stats.lostReports + stats.foundReports).toLocaleString(),
      sub: `${stats.lostReports} lost • ${stats.foundReports} found`,
      icon: FileText,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      action: () => onNavigateSection('reports'),
    },
    {
      title: 'Ownership Claims',
      value: stats.pendingClaims,
      sub: 'Pending review across colleges',
      icon: ShieldCheck,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
      action: () => onNavigateSection('claims'),
    },
    {
      title: 'Active Matches',
      value: stats.activeMatches,
      sub: 'Rule-based engine calculations',
      icon: GitCompare,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40',
      action: () => onNavigateSection('matching'),
    },
    {
      title: 'Platform Recovery Rate',
      value: `${stats.recoveryRate}%`,
      sub: `${stats.returnedItems} confirmed item returns`,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
      action: () => onNavigateSection('analytics'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow-card">
        <div>
          <h2 className="text-lg font-black tracking-tight">Super Admin Command Center</h2>
          <p className="text-xs text-purple-200 mt-1">
            Real-time PostgreSQL telemetry, multi-institution federation & RBAC governance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="text-white border-purple-400/40 hover:bg-purple-800/50 text-xs"
          >
            Refresh Telemetry
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onNavigateSection('colleges')}
            className="bg-white text-purple-900 hover:bg-purple-50 text-xs font-bold"
          >
            + Onboard College
          </Button>
        </div>
      </div>

      {/* Grid of 6 Key Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              onClick={card.action}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 group-hover:text-purple-600 transition-colors">
                {card.value}
              </p>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                <span>{card.sub}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Audit Logs & System Health Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Activity */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Recent Audit Log Activity
            </h3>
            <button
              onClick={() => onNavigateSection('audit')}
              className="text-xs text-purple-600 hover:underline font-semibold"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {overviewData?.recentAuditLogs?.length > 0 ? (
              overviewData.recentAuditLogs.slice(0, 5).map((log: any) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.action}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      by {log.actor?.name || 'System'} ({log.actor?.email || 'N/A'})
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No recent audit logs</p>
            )}
          </div>
        </div>

        {/* System Health Status */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              Infrastructure & Worker Status
            </h3>
            <button
              onClick={() => onNavigateSection('infrastructure')}
              className="text-xs text-purple-600 hover:underline font-semibold"
            >
              Details
            </button>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold">PostgreSQL Database Connection</span>
              </div>
              <span className="font-mono text-[11px] font-bold">ONLINE (Pool Healthy)</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 text-[11px]">Campus Worker Keys</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {stats.activeWorkers} / {stats.totalWorkers} Active
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 text-[11px]">Suspended Accounts</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {stats.suspendedAccounts}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-[11px] text-purple-800 dark:text-purple-300">
              <strong>Super Admin Scope:</strong> You have platform-wide governance authority across all institutions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

