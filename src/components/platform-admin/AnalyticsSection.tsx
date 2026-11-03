'use client';

import React from 'react';
import { BarChart3, TrendingUp, CheckCircle, Package, Layers } from 'lucide-react';

interface AnalyticsSectionProps {
  overviewData: any;
}

export function AnalyticsSection({ overviewData }: AnalyticsSectionProps) {
  const stats = overviewData?.stats || {
    totalColleges: 0,
    registeredStudents: 0,
    lostReports: 0,
    foundReports: 0,
    returnedItems: 0,
    recoveryRate: 0,
  };

  const totalReports = stats.lostReports + stats.foundReports;

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          Cross-Institutional Recovery Analytics
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          High-level reporting breakdown, return efficiency, and multi-campus performance telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
          <span className="text-xs font-semibold text-slate-400">Total System Reports</span>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalReports}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{stats.lostReports} Lost Items</span>
            <span>•</span>
            <span>{stats.foundReports} Found Items</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
          <span className="text-xs font-semibold text-slate-400">Successfully Returned</span>
          <p className="text-3xl font-black text-emerald-600">{stats.returnedItems}</p>
          <p className="text-xs text-slate-500">Verified via 6-digit OTP code handover</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
          <span className="text-xs font-semibold text-slate-400">Overall Recovery Rate</span>
          <p className="text-3xl font-black text-purple-600">{stats.recoveryRate}%</p>
          <p className="text-xs text-slate-500">Items successfully reunited with owners</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
          Multi-Institution Platform Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-400">Total Institutions</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {stats.totalColleges}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-400">Active Students</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {stats.registeredStudents}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-400">Active Matches</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {stats.activeMatches || 0}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-400">Pending Claims</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {stats.pendingClaims || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
