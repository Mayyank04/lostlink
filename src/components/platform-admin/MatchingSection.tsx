'use client';

import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  Activity,
  Key,
  RefreshCw,
  Cpu,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

export function MatchingSection() {
  const { success, error } = useToast();
  const [matchingData, setMatchingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const loadMatchingData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/platform-admin/matching');
      const data = await res.json();
      if (data.success) {
        setMatchingData(data);
      } else {
        error('Error', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatchingData();
  }, []);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch('/api/matches/recalculate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        success('Recalculation Complete', 'Matching engine recalculated potential candidate matches.');
        loadMatchingData();
      } else {
        error('Recalculation Failed', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-purple-600" />
            Rule-Based Smart Matching Engine & Workers
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Automated multi-attribute scoring (category, brand, color, location building, occurred window).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadMatchingData} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
          <Button size="sm" variant="primary" onClick={handleRecalculate} disabled={isRecalculating} className="text-xs">
            <Cpu className="w-3.5 h-3.5 mr-1" />
            {isRecalculating ? 'Recalculating...' : 'Trigger Recalculation'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Potential Matches</span>
            <GitCompare className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {matchingData?.totalMatches ?? '...'}
          </p>
          <p className="text-[11px] text-slate-400">Computed item correlation pairs</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Campus Worker Keys</span>
            <Key className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {matchingData?.workers?.active || 0} / {matchingData?.workers?.total || 0}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold">Active background workers</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Scoring Formula</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            Category + Brand + Color + Campus
          </p>
          <p className="text-[11px] text-slate-400">Threshold: &gt;= 0.65 confidence</p>
        </div>
      </div>
    </div>
  );
}

