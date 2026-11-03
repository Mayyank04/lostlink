'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  UserPlus,
  RefreshCw,
  Building,
  Mail,
  Shield,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';

export function AdminsSection() {
  const { success, error } = useToast();
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadAdmins = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/platform-admin/users?role=COLLEGE_ADMIN');
      const data = await res.json();
      if (data.success) {
        setAdmins(data.users);
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
    loadAdmins();
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            Designated College Administrators
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Institutional officers assigned to moderate local campus reports, verify student IDs, and oversee item handovers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadAdmins} className="text-xs">
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
                <th className="p-3.5">Administrator</th>
                <th className="p-3.5">Assigned College</th>
                <th className="p-3.5">Role Level</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Assigned Date</th>
                <th className="p-3.5 text-right">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading college administrators...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No college administrators registered yet.
                  </td>
                </tr>
              ) : (
                admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">{adm.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{adm.email}</p>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      {adm.memberships?.[0]?.college?.name || 'Unassigned'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        COLLEGE_ADMIN
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          adm.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {adm.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {new Date(adm.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-500">
                      Single-Tenant Scoped
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

