'use client';

import React from 'react';
import {
  Lock,
  ShieldCheck,
  KeyRound,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
} from 'lucide-react';

export function SecuritySection() {
  const rbacMatrix = [
    { role: 'PLATFORM_ADMIN', scope: 'Global (All Colleges)', manageTenants: 'Yes', manageUsers: 'All', viewPrivateEvidence: 'Audit-Only', executeHandover: 'Yes' },
    { role: 'COLLEGE_ADMIN', scope: 'Single College Tenant', manageTenants: 'No', manageUsers: 'College Students', viewPrivateEvidence: 'Yes (Local)', executeHandover: 'Yes' },
    { role: 'COLLEGE_MODERATOR', scope: 'Single College Tenant', manageTenants: 'No', manageUsers: 'View Only', viewPrivateEvidence: 'Yes (Local)', executeHandover: 'Yes' },
    { role: 'STUDENT', scope: 'Self / Permitted College', manageTenants: 'No', manageUsers: 'Self Only', viewPrivateEvidence: 'Own Claim Only', executeHandover: 'Display Code' },
  ];

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-purple-600" />
          Security Architecture & OWASP ASVS 5.0 Verification
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Cryptographic safeguards, role-based tenant boundaries, and credential protections verified in automated testing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
          <div className="flex items-center gap-2 text-purple-600 font-bold">
            <KeyRound className="w-4 h-4" />
            Argon2id Password Storage
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Memory-hard key derivation resistant to GPU and ASIC brute-force cracking. Salted uniquely per user.
          </p>
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Verified OWASP V2
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <Layers className="w-4 h-4" />
            Tenant Isolation Boundaries
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Strict tenant filtering prevents cross-institution data leaks. College administrators cannot query or alter other institutions.
          </p>
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Verified OWASP V4
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <ShieldCheck className="w-4 h-4" />
            IDOR & Evidence Secrecy
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Ownership proof details are blinded to public inquiries and only authorized claimants, finders, and authorized desk officers can access.
          </p>
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Zero Information Leak
          </span>
        </div>
      </div>

      {/* RBAC Matrix Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-xs">
            Role-Based Access Control (RBAC) Entitlements
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Tenant Scope</th>
                <th className="p-3.5">Manage Colleges</th>
                <th className="p-3.5">Student Moderation</th>
                <th className="p-3.5">Evidence Visibility</th>
                <th className="p-3.5">OTP Handover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rbacMatrix.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-bold font-mono text-purple-600">
                    {item.role}
                  </td>
                  <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                    {item.scope}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">{item.manageTenants}</td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">{item.manageUsers}</td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">{item.viewPrivateEvidence}</td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">{item.executeHandover}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

