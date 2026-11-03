'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  ShieldAlert,
  UserCheck,
  UserX,
  RefreshCw,
  Mail,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

export function StudentsSection() {
  const { user: currentUser } = useAuth();
  const { success, error } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '15');

      const res = await fetch(`/api/platform-admin/users?${params.toString()}`);
      const data = await res.json();
      if (data.success || Array.isArray(data.users)) {
        setUsers(data.users || []);
        setTotalPages(data.pagination.totalPages || 1);
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
    loadUsers();
  }, [search, roleFilter, statusFilter, page]);

  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/platform-admin/users/${selectedUser.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('User Updated', data.message);
        setStatusModalOpen(false);
        setReason('');
        loadUsers();
      } else {
        error('Update Failed', data.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Federated Student & User Directory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Global view of registered students, institutional memberships, and account governance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadUsers} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="COLLEGE_ADMIN">College Admin</option>
          <option value="COLLEGE_MODERATOR">College Moderator</option>
          <option value="PLATFORM_ADMIN">Platform Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Student / User</th>
                <th className="p-3.5">College Affiliation</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Items Reported</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Registered</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading student directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {u.name}
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-100 text-purple-800 font-bold">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                      </td>
                      <td className="p-3.5">
                        {u.memberships?.length > 0 ? (
                          u.memberships.map((m: any) => (
                            <span
                              key={m.id}
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mr-1"
                            >
                              {m.college?.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">No active college</span>
                        )}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {u.role}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {u._count?.items || 0}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : u.status === 'SUSPENDED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right">
                        {!isCurrent && (
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setNewStatus(u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                              setStatusModalOpen(true);
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-semibold ${
                              u.status === 'ACTIVE'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Reinstate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`${newStatus === 'SUSPENDED' ? 'Suspend' : 'Reinstate'} User Account`}
        description={`Modify account status for ${selectedUser?.name} (${selectedUser?.email}).`}
        maxWidth="md"
      >
        <form onSubmit={handleStatusChangeSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Account Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="ACTIVE">ACTIVE (Authorized Access)</option>
              <option value="SUSPENDED">SUSPENDED (Revoke Active Sessions & Access)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Administrative Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Terms violation, account compromise, or identity verification resolved."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" variant="outline" type="button" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Confirm Status Change'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

