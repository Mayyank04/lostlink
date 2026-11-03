'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Mail,
  Building,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

export function ApplicationsSection() {
  const { success, error } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/platform-admin/applications?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications);
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
    loadApplications();
  }, [statusFilter]);

  const handleDecision = async (appId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/platform-admin/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: decision,
          reviewNotes: decision === 'APPROVED' ? 'Approved by platform administrator' : 'Application declined',
        }),
      });

      const data = await res.json();
      if (data.success || data.message) {
        success(
          decision === 'APPROVED' ? 'Application Approved' : 'Application Rejected',
          data.message
        );
        loadApplications();
      } else {
        error('Decision Failed', data.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-purple-600" />
            Institutional Onboarding Applications
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review partner onboarding requests. Approving an application automatically creates the tenant, initial campus, and issues administrator invitation credentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <Button size="sm" variant="outline" onClick={loadApplications} className="text-xs">
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
                <th className="p-3.5">Institution & Location</th>
                <th className="p-3.5">Contact Person</th>
                <th className="p-3.5">Email Domain</th>
                <th className="p-3.5">Est. Students</th>
                <th className="p-3.5">Date Submitted</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading onboarding applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No {statusFilter.toLowerCase()} applications found.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">{app.institutionName}</p>
                      <p className="text-[10px] text-slate-400">
                        {app.city}, {app.state}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{app.applicantName}</p>
                      <p className="text-[10px] text-slate-400">{app.applicantEmail}</p>
                    </td>
                    <td className="p-3.5 font-mono text-purple-600 font-semibold">
                      @{app.emailDomain}
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300">
                      {app.estimatedStudents?.toLocaleString() || 'N/A'}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          app.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : app.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      {app.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleDecision(app.id, 'APPROVED')}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                            Approve & Provision
                          </button>
                          <button
                            onClick={() => handleDecision(app.id, 'REJECTED')}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
                          >
                            <XCircle className="w-3.5 h-3.5 inline mr-1" />
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Processed</span>
                      )}
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

