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
  Edit2,
  Eye,
  Globe,
  MapPin,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function CollegesSection({ initialAddOpen = false }: { initialAddOpen?: boolean }) {
  const { success, error } = useToast();
  const [colleges, setColleges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(initialAddOpen);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<any>(null);

  // Add College Form State
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [emailDomains, setEmailDomains] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
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

  // Edit College State
  const [editName, setEditName] = useState('');
  const [editShortName, setEditShortName] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editDomains, setEditDomains] = useState('');

  // Invite Admin State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  useEffect(() => {
    if (initialAddOpen) {
      setAddModalOpen(true);
    }
  }, [initialAddOpen]);

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
      if (data.success || Array.isArray(data.colleges)) {
        setColleges(data.colleges || []);
        setTotalPages(data.pagination?.totalPages || 1);
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
    if (isSubmitting) return;

    if (!name.trim()) {
      error('Validation Error', 'College name is required');
      return;
    }

    const cleanSlug = generateSlug(slug || shortName || name);
    if (!cleanSlug || cleanSlug.length < 2) {
      error('Validation Error', 'Tenant slug must be at least 2 characters');
      return;
    }

    if (!emailDomains.trim()) {
      error('Validation Error', 'At least one approved email domain is required');
      return;
    }

    const rawDomains = emailDomains
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    if (rawDomains.length === 0) {
      error('Validation Error', 'At least one approved email domain is required');
      return;
    }

    // Check for user emails in domain field (e.g. mayank@iilm.edu)
    const emailWithAt = rawDomains.find((d) => d.includes('@'));
    if (emailWithAt) {
      const msg = `Enter domain only (e.g. 'iilm.edu'), not an email address like '${emailWithAt}'`;
      setDomainError(msg);
      error('Invalid Domain', msg);
      return;
    }

    const domainRegex = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)+$/i;
    const invalidDomain = rawDomains.find((d) => !domainRegex.test(d));
    if (invalidDomain) {
      const msg = `"${invalidDomain}" is not a valid domain. Example: "iilm.edu" or "students.iilm.edu"`;
      setDomainError(msg);
      error('Invalid Domain Format', msg);
      return;
    }

    // Validate admin email if provided
    if (adminEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminEmail.trim())) {
        error('Invalid Administrator Email', 'Please provide a valid administrator email address');
        return;
      }
    }

    setDomainError(null);
    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        shortName: shortName.trim() || undefined,
        slug: cleanSlug,
        emailDomains: rawDomains,
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
          email: adminEmail.trim().toLowerCase(),
          name: adminName.trim() || 'College Administrator',
        };
      }

      const res = await fetch('/api/platform-admin/colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 201 || data.success || data.college) {
        success('College Onboarded', `Successfully added ${data.college?.name || name}!`);
        setAddModalOpen(false);
        resetAddForm();
        await loadColleges();
      } else {
        error('Onboarding Failed', data.error || 'Server error provisioning tenant');
      }
    } catch (err: any) {
      error('Network Error', err.message || 'Failed to communicate with provisioning service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setName('');
    setShortName('');
    setSlug('');
    setSlugManuallyEdited(false);
    setEmailDomains('');
    setDomainError(null);
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

  const openEditModal = (col: any) => {
    setSelectedCollege(col);
    setEditName(col.name || '');
    setEditShortName(col.shortName || '');
    setEditWebsite(col.website || '');
    setEditContactEmail(col.contactEmail || '');
    setEditCity(col.city || '');
    setEditState(col.state || '');
    setEditDomains(col.emailDomains?.join(', ') || '');
    setEditModalOpen(true);
  };

  const handleEditCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollege || !editName.trim()) return;

    setIsSubmitting(true);
    try {
      const domains = editDomains
        .split(',')
        .map((d) => d.trim().replace(/^@/, ''))
        .filter(Boolean);

      const payload: any = {
        name: editName.trim(),
        shortName: editShortName.trim() || null,
        website: editWebsite.trim() || undefined,
        contactEmail: editContactEmail.trim() || undefined,
        city: editCity.trim() || undefined,
        state: editState.trim() || undefined,
        emailDomains: domains.length > 0 ? domains : undefined,
      };

      const res = await fetch(`/api/platform-admin/colleges/${selectedCollege.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.college || data.success) {
        success('College Updated', `Successfully updated ${editName}!`);
        setEditModalOpen(false);
        loadColleges();
      } else {
        error('Update Failed', data.error || 'Server error');
      }
    } catch (err: any) {
      error('Network Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openViewModal = (col: any) => {
    setSelectedCollege(col);
    setViewModalOpen(true);
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
                      <button
                        onClick={() => openViewModal(col)}
                        className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                        title="View Profile"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => openEditModal(col)}
                        className="px-2 py-1 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100"
                        title="Edit Institution"
                      >
                        <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                        Edit
                      </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="College Name *"
              placeholder="e.g. Carnegie Mellon University"
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                if (!slugManuallyEdited) {
                  setSlug(generateSlug(shortName || val));
                }
              }}
              required
            />
            <Input
              label="Short Name / Abbr"
              placeholder="e.g. CMU, MIT"
              value={shortName}
              onChange={(e) => {
                const val = e.target.value;
                setShortName(val);
                if (!slugManuallyEdited && val.trim()) {
                  setSlug(generateSlug(val));
                }
              }}
            />
            <div>
              <Input
                label="Tenant Slug *"
                placeholder="e.g. cmu"
                value={slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                }}
                required
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                URL identifier (auto-derived or custom)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Approved Email Domains * (comma-separated)"
                placeholder="e.g. cmu.edu, andrew.cmu.edu"
                value={emailDomains}
                onChange={(e) => {
                  setEmailDomains(e.target.value);
                  if (domainError) setDomainError(null);
                }}
                required
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Institutional domains only (e.g. &apos;iilm.edu&apos;). Do not include &apos;@&apos; or emails.
              </p>
              {domainError && (
                <p className="text-[10px] text-rose-600 font-semibold mt-1">
                  {domainError}
                </p>
              )}
            </div>
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
              label="Official Website"
              placeholder="https://www.institution.edu"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <Input
              label="Official Contact Email"
              placeholder="lostfound@institution.edu"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="e.g. Pittsburgh"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              label="State / Region"
              placeholder="e.g. Pennsylvania"
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
              {isSubmitting ? 'Provisioning Tenant...' : 'Provision Institution Tenant'}
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

      {/* Edit College Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Institution: ${selectedCollege?.name}`}
        description="Update institution name, short abbreviation, domains, contact info, and website."
        maxWidth="md"
      >
        <form onSubmit={handleEditCollege} className="space-y-4 text-xs">
          <Input
            label="College Official Name *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <Input
            label="Short Name / Abbreviation"
            placeholder="e.g. CMU, MIT, Apex Tech"
            value={editShortName}
            onChange={(e) => setEditShortName(e.target.value)}
          />
          <Input
            label="Approved Email Domains (comma-separated)"
            placeholder="e.g. cmu.edu, andrew.cmu.edu"
            value={editDomains}
            onChange={(e) => setEditDomains(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Official Website"
              placeholder="https://institution.edu"
              value={editWebsite}
              onChange={(e) => setEditWebsite(e.target.value)}
            />
            <Input
              label="Contact Email"
              placeholder="lostfound@institution.edu"
              value={editContactEmail}
              onChange={(e) => setEditContactEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="City"
              value={editCity}
              onChange={(e) => setEditCity(e.target.value)}
            />
            <Input
              label="State / Region"
              value={editState}
              onChange={(e) => setEditState(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" variant="outline" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={isSubmitting || !editName.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View College Profile Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Institution Profile: ${selectedCollege?.name}`}
        description={`Tenant Slug: ${selectedCollege?.slug} • Status: ${selectedCollege?.status}`}
        maxWidth="md"
      >
        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2.5 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/50 dark:border-slate-700/50">
              <span className="text-slate-500">Short Name:</span>
              <span className="font-bold text-slate-900 dark:text-white">{selectedCollege?.shortName || 'None assigned'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/50 dark:border-slate-700/50">
              <span className="text-slate-500">Location:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCollege?.city}, {selectedCollege?.state} ({selectedCollege?.country || 'USA'})</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/50 dark:border-slate-700/50">
              <span className="text-slate-500">Official Domains:</span>
              <span className="font-mono text-purple-600 font-semibold">{selectedCollege?.emailDomains?.join(', ')}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/50 dark:border-slate-700/50">
              <span className="text-slate-500">Website:</span>
              <span className="font-semibold text-blue-600">{selectedCollege?.website || 'Not provided'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/50 dark:border-slate-700/50">
              <span className="text-slate-500">Campuses / Return Desks:</span>
              <span className="font-bold text-slate-900 dark:text-white">{selectedCollege?._count?.campuses || selectedCollege?.campuses?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Total Enrolled Members:</span>
              <span className="font-bold text-purple-600">{selectedCollege?._count?.memberships || 0}</span>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

