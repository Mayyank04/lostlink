'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, RefreshCw, MessageSquare, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

export function ModerationSection() {
  const { error } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/messages/reports');
      const data = await res.json();
      if (data.reports) {
        setReports(data.reports);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Safety & Content Abuse Moderation
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Student reports of inappropriate behavior, harassment, or scam messages in item recovery chats.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadReports} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Report Reason</th>
                <th className="p-3.5">Reported Sender</th>
                <th className="p-3.5">Flagged By</th>
                <th className="p-3.5">Message Snippet</th>
                <th className="p-3.5">Date Flagged</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading abuse reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No flagged messages or abuse reports reported. Platform communications are clean.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-rose-600">{r.reason}</td>
                    <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      {r.message?.sender?.name} ({r.message?.sender?.email})
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {r.reporter?.name} ({r.reporter?.email})
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {r.message?.content}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        PENDING_REVIEW
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

