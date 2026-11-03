'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  Building2,
  Users,
  FileText,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  KeyRound,
  MapPin,
  Calendar,
  Clock,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import Link from 'next/link';

type TabType = 'overview' | 'students' | 'reports' | 'claims' | 'campuses' | 'handover';

export default function CollegeAdminPage() {
  const { user, role, activeCollege } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [students, setStudents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);

  // Modals & Forms
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [handoverCode, setHandoverCode] = useState('');
  const [handoverClaimId, setHandoverClaimId] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isVerifyingHandover, setIsVerifyingHandover] = useState(false);

  // Add Campus Modal
  const [addCampusOpen, setAddCampusOpen] = useState(false);
  const [campusName, setCampusName] = useState('');
  const [campusCode, setCampusCode] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [deskRoom, setDeskRoom] = useState('Main Return Desk');

  // Add Location Modal
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [locName, setLocName] = useState('');
  const [locBuilding, setLocBuilding] = useState('');

  // Claim Evidence Modal
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  const collegeId = activeCollege?.id;

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      const url = collegeId ? `/api/college-admin/overview?collegeId=${collegeId}` : '/api/college-admin/overview';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOverview(data);
      } else {
        error('Access Error', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const url = collegeId ? `/api/college-admin/students?collegeId=${collegeId}` : '/api/college-admin/students';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setStudents(data.students);
    } catch {}
  };

  const loadReports = async () => {
    try {
      const url = collegeId ? `/api/college-admin/reports?collegeId=${collegeId}` : '/api/college-admin/reports';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setReports(data.reports);
    } catch {}
  };

  const loadClaims = async () => {
    try {
      const url = collegeId ? `/api/college-admin/claims?collegeId=${collegeId}` : '/api/college-admin/claims';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setClaims(data.claims);
    } catch {}
  };

  const loadCampuses = async () => {
    try {
      const url = collegeId ? `/api/college-admin/campuses?collegeId=${collegeId}` : '/api/college-admin/campuses';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setCampuses(data.campuses);
    } catch {}
  };

  useEffect(() => {
    if (user && (role === 'college_admin' || role === 'platform_admin')) {
      loadOverview();
      loadStudents();
      loadReports();
      loadClaims();
      loadCampuses();
    }
  }, [user, role, collegeId]);

  // Handover confirmation
  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverCode.trim()) return;

    setIsVerifyingHandover(true);
    try {
      const res = await fetch('/api/college-admin/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: handoverClaimId || undefined,
          code: handoverCode.trim(),
          notes: handoverNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('Item Return Confirmed', data.message);
        setHandoverModalOpen(false);
        setHandoverCode('');
        setHandoverClaimId('');
        setHandoverNotes('');
        loadOverview();
        loadClaims();
        loadReports();
      } else {
        error('Verification Failed', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    } finally {
      setIsVerifyingHandover(false);
    }
  };

  // Add Campus
  const handleAddCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusName.trim() || !campusCode.trim() || !addressLabel.trim()) return;

    try {
      const res = await fetch('/api/college-admin/campuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeId,
          name: campusName.trim(),
          code: campusCode.trim(),
          addressLabel: addressLabel.trim(),
          lostFoundDeskRoom: deskRoom.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('Campus Added', data.message);
        setAddCampusOpen(false);
        setCampusName('');
        setCampusCode('');
        setAddressLabel('');
        loadCampuses();
      } else {
        error('Failed to Add Campus', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    }
  };

  // Add Location
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampusId || !locName.trim() || !locBuilding.trim()) return;

    try {
      const res = await fetch('/api/college-admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campusId: selectedCampusId,
          name: locName.trim(),
          building: locBuilding.trim(),
          hasDesk: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('Location Added', data.message);
        setAddLocationOpen(false);
        setLocName('');
        setLocBuilding('');
        loadCampuses();
      } else {
        error('Failed to Add Location', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    }
  };

  // Membership action
  const handleMembershipDecision = async (membershipId: string, status: 'VERIFIED' | 'REJECTED' | 'SUSPENDED') => {
    try {
      const res = await fetch(`/api/college-admin/students/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (data.success) {
        success('Membership Updated', data.message);
        loadStudents();
        loadOverview();
      } else {
        error('Update Failed', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    }
  };

  // Claim decision
  const handleClaimDecision = async (claimId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/college-admin/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (data.success) {
        success('Claim Updated', data.message);
        loadClaims();
        loadOverview();
      } else {
        error('Update Failed', data.error);
      }
    } catch (err: any) {
      error('Network Error', err.message);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
        Verifying institutional administrator credentials...
      </div>
    );
  }

  const isAuthorized = role === 'college_admin' || role === 'platform_admin';

  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          Institutional Access Restricted
        </h1>
        <p className="text-xs text-slate-500">
          You must be an approved College Administrator or Moderator to access this institutional panel.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const stats = overview?.stats || {
    totalStudents: 0,
    verifiedStudents: 0,
    pendingStudents: 0,
    lostItems: 0,
    foundItems: 0,
    returnedItems: 0,
    pendingClaims: 0,
    recoveryRate: 0,
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {overview?.college?.name || 'College Administration Panel'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                {role}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Campus Inventory Moderation, Student ID Verification & In-Person Item Handovers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setHandoverModalOpen(true)}
            className="bg-teal-700 hover:bg-teal-800 text-xs font-bold"
          >
            <KeyRound className="w-3.5 h-3.5 mr-1" />
            Verify Return OTP
          </Button>
          <Button size="sm" variant="outline" onClick={loadOverview} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview & Telemetry', icon: Building2 },
          { id: 'students', label: `Students (${students.length})`, icon: Users },
          { id: 'reports', label: `Inventory Reports (${reports.length})`, icon: FileText },
          { id: 'claims', label: `Ownership Claims (${claims.length})`, icon: ShieldCheck },
          { id: 'campuses', label: `Campuses & Desks (${campuses.length})`, icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-b-2 border-teal-600 text-teal-700 dark:text-teal-400 font-bold bg-teal-50/50 dark:bg-teal-950/20'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card">
              <span className="text-xs font-semibold text-slate-400">Registered Students</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {stats.totalStudents}
              </p>
              <p className="text-[11px] text-teal-600 font-semibold">{stats.verifiedStudents} verified</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card">
              <span className="text-xs font-semibold text-slate-400">Total Reports</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {stats.lostItems + stats.foundItems}
              </p>
              <p className="text-[11px] text-slate-400">{stats.lostItems} lost • {stats.foundItems} found</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card">
              <span className="text-xs font-semibold text-slate-400">Returned Items</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {stats.returnedItems}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">Confirmed returns</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card">
              <span className="text-xs font-semibold text-slate-400">Campus Recovery Rate</span>
              <p className="text-2xl font-black text-teal-600 mt-1">
                {stats.recoveryRate}%
              </p>
              <p className="text-[11px] text-slate-400">Successful handovers</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Students */}
      {activeTab === 'students' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Student</th>
                  <th className="p-3.5">Student ID</th>
                  <th className="p-3.5">Membership Status</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5">Date Joined</th>
                  <th className="p-3.5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((s) => (
                  <tr key={s.membershipId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{s.email}</p>
                    </td>
                    <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {s.studentIdentifier || 'Pending'}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.membershipStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.membershipStatus}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {s.userStatus}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      {s.membershipStatus !== 'VERIFIED' && (
                        <button
                          onClick={() => handleMembershipDecision(s.membershipId, 'VERIFIED')}
                          className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Verify ID
                        </button>
                      )}
                      {s.membershipStatus === 'VERIFIED' && (
                        <button
                          onClick={() => handleMembershipDecision(s.membershipId, 'SUSPENDED')}
                          className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Reports */}
      {activeTab === 'reports' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Report #</th>
                  <th className="p-3.5">Item</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Campus / Building</th>
                  <th className="p-3.5">Desk Deposit</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-mono font-bold text-teal-700">{r.reportNumber}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{r.name}</td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{r.type}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {r.campus?.name} • {r.locationBuilding}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.depositedWithOffice ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.depositedWithOffice ? 'At Security Desk' : 'With Student'}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Claims */}
      {activeTab === 'claims' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Claim Ref</th>
                  <th className="p-3.5">Item</th>
                  <th className="p-3.5">Claimant</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Moderator Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {claims.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-mono font-bold text-teal-700">{c.referenceNumber}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{c.itemTitle}</td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300">
                      {c.claimant?.name} ({c.claimant?.email})
                    </td>
                    <td className="p-3.5 font-semibold">{c.status}</td>
                    <td className="p-3.5 text-right space-x-1">
                      {c.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleClaimDecision(c.id, 'APPROVED')}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleClaimDecision(c.id, 'REJECTED')}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 text-white hover:bg-rose-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Campuses & Locations */}
      {activeTab === 'campuses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Configured Campuses & Drop-off Desks
            </h3>
            <div className="space-x-2">
              <Button size="sm" variant="primary" onClick={() => setAddCampusOpen(true)} className="text-xs">
                + Add Campus
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAddLocationOpen(true)} className="text-xs">
                + Add Location
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campuses.map((camp) => (
              <div
                key={camp.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-3 text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{camp.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">Code: {camp.code}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                    {camp.locations?.length || 0} Locations
                  </span>
                </div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <p><strong>Primary Desk:</strong> {camp.lostFoundDeskRoom}</p>
                  <p><strong>Hours:</strong> {camp.operatingHours}</p>
                  <p><strong>Contact:</strong> {camp.contactEmail}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Locations:</p>
                  <div className="flex flex-wrap gap-1">
                    {camp.locations?.map((loc: any) => (
                      <span
                        key={loc.id}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {loc.name} ({loc.building})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verify Return Modal */}
      <Modal
        isOpen={handoverModalOpen}
        onClose={() => setHandoverModalOpen(false)}
        title="Verify In-Person Item Return"
        description="Ask the student to present the 6-digit OTP code displayed on their recovery dashboard."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmHandover} className="space-y-4 text-xs">
          <Input
            label="6-Digit Verification OTP Code *"
            placeholder="e.g. 849201"
            value={handoverCode}
            onChange={(e) => setHandoverCode(e.target.value)}
          />

          <Input
            label="Claim Reference or ID (Optional)"
            placeholder="CLM-..."
            value={handoverClaimId}
            onChange={(e) => setHandoverClaimId(e.target.value)}
          />

          <Input
            label="Handover Officer Notes"
            placeholder="e.g. Verified with Student ID card, handover completed at Main Desk."
            value={handoverNotes}
            onChange={(e) => setHandoverNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" variant="outline" type="button" onClick={() => setHandoverModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={isVerifyingHandover || !handoverCode.trim()}>
              {isVerifyingHandover ? 'Verifying...' : 'Confirm Return'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Campus Modal */}
      <Modal
        isOpen={addCampusOpen}
        onClose={() => setAddCampusOpen(false)}
        title="Add Campus to College"
        description="Add a new campus site with return desk information."
        maxWidth="md"
      >
        <form onSubmit={handleAddCampus} className="space-y-3 text-xs">
          <Input label="Campus Name *" placeholder="North Campus" value={campusName} onChange={(e) => setCampusName(e.target.value)} />
          <Input label="Campus Code *" placeholder="NORTH" value={campusCode} onChange={(e) => setCampusCode(e.target.value)} />
          <Input label="Address Label *" placeholder="100 North Blvd" value={addressLabel} onChange={(e) => setAddressLabel(e.target.value)} />
          <Input label="Desk Room" placeholder="Student Center Room 102" value={deskRoom} onChange={(e) => setDeskRoom(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setAddCampusOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" type="submit">Create Campus</Button>
          </div>
        </form>
      </Modal>

      {/* Add Location Modal */}
      <Modal
        isOpen={addLocationOpen}
        onClose={() => setAddLocationOpen(false)}
        title="Add Campus Location"
        description="Add a building or return desk to an existing campus."
        maxWidth="md"
      >
        <form onSubmit={handleAddLocation} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Select Campus *</label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="">Choose Campus...</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <Input label="Location Name *" placeholder="Science Library Return Box" value={locName} onChange={(e) => setLocName(e.target.value)} />
          <Input label="Building *" placeholder="Science Hall" value={locBuilding} onChange={(e) => setLocBuilding(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setAddLocationOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" type="submit" disabled={!selectedCampusId}>Add Location</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
