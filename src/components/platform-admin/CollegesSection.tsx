'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Archive,
  RefreshCw,
  Mail,
  ExternalLink,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';

export function CollegesSection() {
  const { success, error } = useToast();
  const [colleges, setColleges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<any>(null);

  // Add College Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [emailDomains, setEmailDomains] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [institutionType, setInstitutionType] = useState('University');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [campusName, setCampusName] = useState('Main Campus');
  const [campusCode, setCampusCode] = useState('MAIN');
  const [locationName, setLocationName] = useState('Main Desk / Security');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite Admin State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const loadColleges = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '10');

      const res = await fetch(`/api/platform-admin/colleges?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setColleges(data.colleges);
        setTotalPages(data.pagination.totalPages || 1);
      } else {
        error('Failed to load colleges', data.error);
      }
    } catch (err: any) {
      error('Error loading colleges', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadColleges();
  }, [search, statusFilter, page]);

  // Handle Add College Submit
  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !emailDomains.trim()) {
      error('Validation Error', 'Name, slug, and email domains are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const domains = emailDomains
        .split(',')
        .map((d) => d.trim().replace(/^@/, ''))
        .filter(Boolean);

      const payload: any = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        emailDomains: domains,
        city: city.trim() || 'Main City',
        state: state.trim() || 'State',
        institutionType,
        website: website.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        initialCampus: {
          name: campusName.trim() || 'Main Campus',
          code: campusCode.trim().toUpperCase() || 'MAIN',
          addressLabel: `${name.trim()} - Main Hall`,
          initialLocationName: locationName.trim() || 'Main Desk',
        },
      };

      if (adminEmail.trim()) {
        payload.collegeAdmin = {
          email: adminEmail.trim(),
          name: adminName.trim() || 'College Administrator',
        };
      }

      const res = await fetch('/api/platform-admin/colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        success('College Onboarded', `Successfully added ${data.college.name}!`);
        setAddModalOpen(false);
        resetAddForm();
        loadColleges();
      } else {
        error('Onboarding Failed', data.error || 'Server error');
      }
    } catch (err: any) {
      error('Network Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setName('');
    setSlug('');
    setEmailDomains('');
    setCity('');
    setState('');
    setWebsite('');
    setContactEmail('');
    setCampusName('Main Campus');
    setCampusCode('MAIN');
    setLocationName('Main Desk / Security');
    setAdminEmail('');
    setAdminName('');
  };

  // Status Actions
  const handleAction = async (collegeId: string, action: 'approve' | 'suspend' | 'reactivate' | 'archive') => {
    try {
      const res = await fetch(`/api/platform-admin/colleges/${collegeId}/${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        success('Action Completed', data.message);
        loadColleges();
      } else {
        error('Action Failed', data.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  // Handle Invite Admin
  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollege || !inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/platform-admin/colleges/${selectedCollege.id}/invite-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || 'College Administrator',
          role: 'COLLEGE_ADMIN',
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('Invitation Generated', data.message);
        setInviteModalOpen(false);
        setInviteEmail('');
        setInviteName('');
        loadColleges();
      } else {
        error('Invitation Failed', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            Manage Federated Institutions
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Unlimited logical multi-tenant college onboarding with atomic campus provisioning.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadColleges} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
          <Button size="sm" variant="primary" onClick={() => setAddModalOpen(true)} className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add College
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, slug, domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44 py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Colleges Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Institution</th>
                <th className="p-3.5">Domains</th>
                <th className="p-3.5">Campuses / Locations</th>
                <th className="p-3.5">Students</th>
                <th className="p-3.5">Reports</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading institutions...
                  </td>
                </tr>
              ) : colleges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No colleges found matching search criteria.
                  </td>
                </tr>
              ) : (
                colleges.map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">{col.name}</p>
                      <p className="text-[10px] text-slate-400">
                        slug: <span className="font-mono text-purple-600">{col.slug}</span> • {col.city}, {col.state}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {col.emailDomains?.map((d: string) => (
                          <span
                            key={d}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          >
                            @{d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {col._count?.campuses || col.campuses?.length || 0} Campuses
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {col._count?.memberships || 0}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {col._count?.items || 0}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          col.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : col.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {col.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      {col.status === 'PENDING' && (
                        <button
                          onClick={() => handleAction(col.id, 'approve')}
                          className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                      )}
                      {col.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleAction(col.id, 'suspend')}
                          className="px-2 py-1 rounded text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700"
                        >
                          Suspend
                        </button>
                      )}
                      {col.status === 'SUSPENDED' && (
                        <button
                          onClick={() => handleAction(col.id, 'reactivate')}
                          className="px-2 py-1 rounded text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Reactivate
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedCollege(col);
                          setInviteModalOpen(true);
                        }}
                        className="px-2 py-1 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 hover:bg-purple-100"
                        title="Invite or assign college admin"
                      >
                        <UserPlus className="w-3.5 h-3.5 inline mr-1" />
                        Admin
                      </button>
                      <button
                        onClick={() => handleAction(col.id, 'archive')}
                        className="px-2 py-1 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Archive college"
                      >
                        <Archive className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add College Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Onboard New Institution Tenant"
        description="Provision a college with active domains, campus hierarchy, and administrative credentials."
        maxWidth="lg"
      >
        <form onSubmit={handleAddCollege} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="College Name *"
              placeholder="e.g. Stanford University"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30));
                }
              }}
            />
            <Input
              label="Tenant Slug *"
              placeholder="e.g. stanford"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Approved Email Domains * (comma-separated)"
              placeholder="e.g. stanford.edu, cs.stanford.edu"
              value={emailDomains}
              onChange={(e) => setEmailDomains(e.target.value)}
            />
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Institution Type
              </label>
              <select
                value={institutionType}
                onChange={(e) => setInstitutionType(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="University">University</option>
                <option value="College">College</option>
                <option value="Polytechnic">Polytechnic</option>
                <option value="Institute">Institute of Technology</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="e.g. Stanford / Palo Alto"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              label="State / Region"
              placeholder="e.g. California"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <p className="font-bold text-slate-900 dark:text-white mb-2">Initial Campus & Return Desk</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Campus Name"
                placeholder="Main Campus"
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
              />
              <Input
                label="Campus Code"
                placeholder="MAIN"
                value={campusCode}
                onChange={(e) => setCampusCode(e.target.value)}
              />
              <Input
                label="Primary Desk Room"
                placeholder="Main Security / Desk"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <p className="font-bold text-slate-900 dark:text-white mb-2">Initial College Administrator (Optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Administrator Email"
                placeholder="admin@college.edu"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
              <Input
                label="Administrator Name"
                placeholder="Dr. Alex Rivera"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" variant="outline" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Provisioning...' : 'Provision Institution Tenant'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Admin Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={`Invite Admin for ${selectedCollege?.name}`}
        description="Assign an existing user or generate a 14-day cryptographic invitation token."
        maxWidth="md"
      >
        <form onSubmit={handleInviteAdmin} className="space-y-4 text-xs">
          <Input
            label="Administrator Email *"
            placeholder="admin@institution.edu"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Input
            label="Administrator Full Name"
            placeholder="Official Name"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" variant="outline" type="button" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={isSubmitting || !inviteEmail.trim()}>
              {isSubmitting ? 'Sending...' : 'Issue Administrator Invitation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

