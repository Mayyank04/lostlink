'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Cpu,
  Database,
  Activity,
  HardDrive,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

export function InfrastructureSection() {
  const { error } = useToast();
  const [opsData, setOpsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOperations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/platform-admin/operations');
      const data = await res.json();
      if (data.success) {
        setOpsData(data);
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
    loadOperations();
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? `${d}d ` : ''}${h}h ${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-purple-600" />
            Infrastructure & Cluster Runtime Health
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real process telemetry, PostgreSQL latency, Node.js memory footprint, and worker keys.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadOperations} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Ping Telemetry
          </Button>
        </div>
      </div>

      {isLoading && !opsData ? (
        <div className="p-8 text-center text-slate-400">Pinging backend infrastructure...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Database Latency</span>
              <Database className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600">
              {opsData?.database?.latencyMs} ms
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              PostgreSQL status: <strong>{opsData?.database?.status}</strong>
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Process Memory (RSS)</span>
              <Cpu className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {opsData?.process?.memory?.rssMb} MB
            </p>
            <p className="text-[11px] text-slate-500">
              Heap: {opsData?.process?.memory?.heapUsedMb} MB / {opsData?.process?.memory?.heapTotalMb} MB
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Process Uptime</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatUptime(opsData?.process?.uptimeSeconds || 0)}
            </p>
            <p className="text-[11px] text-slate-500">
              Node {opsData?.process?.nodeVersion} ({opsData?.process?.arch})
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Campus Worker Keys</span>
              <Activity className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {opsData?.workers?.active} / {opsData?.workers?.total}
            </p>
            <p className="text-[11px] text-slate-500">
              Active hybrid matching agents
            </p>
          </div>
        </div>
      )}

      {/* Operational Queue & Kubernetes Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Matching Engine Queue</h4>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Pending</span>
              <p className="text-lg font-black text-amber-600">{opsData?.queue?.pendingJobs ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Failed</span>
              <p className="text-lg font-black text-rose-600">{opsData?.queue?.failedJobs ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Run</span>
              <p className="text-lg font-black text-purple-600">{opsData?.queue?.totalProcessed ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Kubernetes Integration</h4>
            <Server className="w-4 h-4 text-blue-600" />
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Cluster Scraper Status:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                opsData?.kubernetes?.configured
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {opsData?.kubernetes?.status || 'NOT_CONFIGURED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
              {opsData?.kubernetes?.note || 'In-cluster metrics available when deployed under k8s pod service account.'}
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Environment Details */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-purple-600" />
          Cloud Architecture & Container Cluster Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              Container Runtime
            </span>
            <p className="font-semibold text-slate-900 dark:text-white mt-1">
              Docker / containerd
            </p>
            <p className="text-[10px] text-slate-400">OCI Image Compliance</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              Orchestrator
            </span>
            <p className="font-semibold text-slate-900 dark:text-white mt-1">
              Kubernetes v1.28+ (k3d / K8s)
            </p>
            <p className="text-[10px] text-slate-400">Module IV PBL Project Target</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              Public Edge Tunnel
            </span>
            <p className="font-semibold text-slate-900 dark:text-white mt-1">
              Cloudflare Tunnel / ACME TLS
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold">Zero open inbound ports</p>
          </div>
        </div>
      </div>
    </div>
  );
}

