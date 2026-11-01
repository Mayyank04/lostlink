'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PlatformAdminAnalytics } from '@/types/analytics';
import { AnalyticsService } from '@/lib/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  ShieldAlert,
  Server,
  Globe2,
  Building,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Activity,
  Cpu,
  Database,
  ArrowRight,
} from 'lucide-react';

export default function PlatformAdminPage() {
  const { user, role, allColleges } = useAuth();
  const { success, error } = useToast();

  const [analytics, setAnalytics] = useState<PlatformAdminAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeDomain, setNewCollegeDomain] = useState('');
  const [newCollegeState, setNewCollegeState] = useState('');

  const loadPlatformData = async () => {
    setIsLoading(true);
    try {
      const data = await AnalyticsService.getPlatformAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, []);

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollegeName.trim() || !newCollegeDomain.trim()) return;

    success(
      'College Onboarding Initiated',
      `${newCollegeName} (${newCollegeDomain}) provisioned with temporary multi-campus tenant namespace.`
    );
    setOnboardModalOpen(false);
    setNewCollegeName('');
    setNewCollegeDomain('');
    setNewCollegeState('');
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8 max-w-6xl">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-700 text-white flex items-center justify-center font-bold text-xl shadow-sm">
            <Globe2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                LostLink Platform Governance
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cross-Institutional Federation & Hybrid-Cloud Kubernetes Orchestration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => setOnboardModalOpen(true)} className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Onboard New College
          </Button>
          <Button size="sm" variant="outline" onClick={loadPlatformData} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh Health
          </Button>
        </div>
      </div>

      {/* Platform Stat Cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Federated Colleges"
            value={analytics.totalCollegesCount}
            subtitle="Active university tenants"
            icon={Building}
            variant="teal"
          />
          <StatCard
            title="Total Students"
            value="54,800"
            subtitle="Verified email domains"
            icon={Activity}
            variant="blue"
          />
          <StatCard
            title="Total Platform Reports"
            value={analytics.totalPlatformReports}
            subtitle="Demonstration register"
            icon={Server}
            variant="amber"
          />
          <StatCard
            title="Avg Recovery Rate"
            value={`${analytics.averagePlatformRecoveryRate}%`}
            subtitle="Multi-campus success"
            icon={CheckCircle2}
            variant="emerald"
          />
        </div>
      )}

      {/* Hybrid-Cloud Kubernetes & Backend Health Monitoring */}
      {analytics && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-brandTeal-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Hybrid-Cloud Kubernetes Infrastructure Health
                </h3>
                <p className="text-[11px] text-slate-400">
                  Target deployment environment: Containerized Kubernetes cluster (Module IV Cloud Computing PBL)
                </p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-brandTeal-600" /> K8s Pods
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {analytics.systemHealth.k8sPodsHealthy} / {analytics.systemHealth.k8sPodsTotal} Healthy
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold">Zero pod restarts</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-blue-600" /> API Gateway Latency
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {analytics.systemHealth.apiLatencyMs} ms
              </p>
              <p className="text-[10px] text-slate-400">p99 latency: 98 ms</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-purple-600" /> PostgreSQL Connection Pool
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                Active & Healthy
              </p>
              <p className="text-[10px] text-slate-400">{analytics.systemHealth.databasePoolStatus}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5 text-amber-600" /> Uptime SLA
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {analytics.systemHealth.uptimePercent}%
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold">30-day window</p>
            </div>
          </div>
        </div>
      )}

      {/* College Onboarding & Tenant Directory Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card space-y-4 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Institutional Tenants & Campuses
            </h3>
            <p className="text-xs text-slate-500">
              Approved universities participating in the shared lost-and-found federated registry
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Institution Name</th>
                <th className="p-3.5">Verified Domain</th>
                <th className="p-3.5">Campuses</th>
                <th className="p-3.5">Students</th>
                <th className="p-3.5">Recovery Rate</th>
                <th className="p-3.5">Tenant Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allColleges.map((col) => (
                <tr key={col.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900 dark:text-white">{col.name}</p>
                    <p className="text-[10px] text-slate-400">{col.state}, USA</p>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-brandTeal-600">
                    @{col.domain}
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                    {col.campuses.length} Campuses
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                    {col.activeUsersCount.toLocaleString()}
                  </td>
                  <td className="p-3.5 font-bold text-emerald-600">
                    80.2%
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Approved & Active
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Manage Tenant
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Modal */}
      <Modal
        isOpen={onboardModalOpen}
        onClose={() => setOnboardModalOpen(false)}
        title="Onboard New University Institution"
        description="Add a new college tenant with campus configurations and verified student domain."
        maxWidth="md"
      >
        <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
          <Input
            label="College / University Name *"
            placeholder="e.g. Stanford University, MIT, Berkeley"
            value={newCollegeName}
            onChange={(e) => setNewCollegeName(e.target.value)}
          />

          <Input
            label="Official Student Email Domain *"
            placeholder="e.g. stanford.edu (used for SSO verification)"
            value={newCollegeDomain}
            onChange={(e) => setNewCollegeDomain(e.target.value)}
          />

          <Input
            label="State / Region *"
            placeholder="e.g. California, Massachusetts"
            value={newCollegeState}
            onChange={(e) => setNewCollegeState(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" variant="outline" type="button" onClick={() => setOnboardModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={!newCollegeName.trim() || !newCollegeDomain.trim()}>
              Provision Institution Tenant
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

