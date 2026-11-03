'use client';

import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  RefreshCw,
  ShieldCheck,
  User,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';

export function AuditLogsSection() {
  const { error } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      params.set('limit', '30');

      const res = await fetch(`/api/platform-admin/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.auditLogs);
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
    loadLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-purple-600" />
            Immutable Audit Trail & Security Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete record of administrative actions, college onboarding, role alterations, and evidence access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="">All Actions</option>
            <option value="COLLEGE_CREATED">COLLEGE_CREATED</option>
            <option value="COLLEGE_STATUS_CHANGED">COLLEGE_STATUS_CHANGED</option>
            <option value="USER_STATUS_CHANGED">USER_STATUS_CHANGED</option>
            <option value="CLAIM_STATUS_CHANGED">CLAIM_STATUS_CHANGED</option>
            <option value="REPORT_STATUS_CHANGED">REPORT_STATUS_CHANGED</option>
            <option value="SETTINGS_UPDATE">SETTINGS_UPDATE</option>
          </select>
          <Button size="sm" variant="outline" onClick={loadLogs} className="text-xs">
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
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Target Resource</th>
                <th className="p-3.5">College</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.actor?.name || 'System / Anonymous'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{log.actor?.email}</p>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {log.resourceType || log.resource} {log.resourceId && `(${log.resourceId.slice(0, 8)}...)`}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {log.college?.name || 'Global'}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setDetailModalOpen(true);
                        }}
                        className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Audit Log Entry Inspector"
        description={`Record ID: ${selectedLog?.id}`}
        maxWidth="md"
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
            <p><strong>Action:</strong> {selectedLog?.action}</p>
            <p><strong>Actor:</strong> {selectedLog?.actor?.name} ({selectedLog?.actor?.email})</p>
            <p><strong>Resource:</strong> {selectedLog?.resourceType || selectedLog?.resource}</p>
            <p><strong>Timestamp:</strong> {selectedLog?.timestamp ? new Date(selectedLog.timestamp).toISOString() : ''}</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Metadata / Payload
            </label>
            <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-60">
              {selectedLog?.metadata || JSON.stringify(selectedLog?.details, null, 2) || '{}'}
            </pre>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" variant="outline" onClick={() => setDetailModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

