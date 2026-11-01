'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ClaimRequest, ClaimStatus } from '@/types/claim';
import { ClaimService, ReportService } from '@/lib/services/api';
import { HandoverModal } from '@/components/claims/HandoverModal';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  UserCheck,
  Building,
  KeyRound,
  Filter,
} from 'lucide-react';

function ClaimsContent() {
  const searchParams = useSearchParams();
  const { user, role, activeCollege } = useAuth();
  const { success, error } = useToast();

  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'submitted' | 'received' | 'all_college'>('submitted');
  const [selectedStatus, setSelectedStatus] = useState<'all' | ClaimStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [handoverClaim, setHandoverClaim] = useState<ClaimRequest | null>(null);

  const fetchClaims = async () => {
    setIsLoading(true);
    try {
      const all = await ClaimService.getClaims({
        collegeId: role === 'platform_admin' ? undefined : activeCollege.id,
      });
      setClaims(all);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [user?.id, activeCollege.id, role]);

  const mySubmittedClaims = claims.filter((c) => c.claimantId === user?.id);
  const myReceivedClaims = claims.filter((c) => c.finderId === user?.id);
  const allCollegeClaims = claims;

  let currentList =
    activeTab === 'submitted'
      ? mySubmittedClaims
      : activeTab === 'received'
      ? myReceivedClaims
      : allCollegeClaims;

  if (selectedStatus !== 'all') {
    currentList = currentList.filter((c) => c.status === selectedStatus);
  }

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" /> Awaiting Review
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <UserCheck className="w-3 h-3" /> Under Custodian Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Ownership Verified — Ready for Pickup
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Handover Completed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3 h-3" /> Proof Rejected
          </span>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Ownership Claims & Custody Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track verification answers, scheduled desk pick-ups, and OTP exchange handovers
          </p>
        </div>

        <Link href="/discover">
          <Button size="sm" variant="outline" className="text-xs">
            Browse Items to Claim
          </Button>
        </Link>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('submitted')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'submitted'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            My Submitted Claims ({mySubmittedClaims.length})
          </button>

          <button
            onClick={() => setActiveTab('received')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'received'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Claims on My Found Items ({myReceivedClaims.length})
          </button>

          {(role === 'college_admin' || role === 'platform_admin') && (
            <button
              onClick={() => setActiveTab('all_college')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'all_college'
                  ? 'bg-brandTeal-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-brandTeal-700'
              }`}
            >
              All College Claims ({allCollegeClaims.length})
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as any)}
          className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved / Ready</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Claims List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : currentList.length > 0 ? (
        <div className="space-y-4">
          {currentList.map((claim) => (
            <div
              key={claim.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-subtle hover:shadow-card transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {claim.referenceNumber}
                  </span>
                  {getStatusBadge(claim.status)}
                </div>
                <span className="text-xs text-slate-400">
                  Created {formatDate(claim.createdAt)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                    {claim.report?.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={claim.report.images[0]} alt={claim.report.title} className="w-full h-full object-cover" />
                    ) : null}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {claim.report?.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Facility: <span className="text-slate-700 dark:text-slate-300 font-medium">{claim.report?.locationBuilding}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                      <span>Claimant: <strong className="text-slate-800 dark:text-slate-200">{claim.claimantName}</strong></span>
                      <span>•</span>
                      <span>Finder: <strong className="text-slate-800 dark:text-slate-200">{claim.finderName}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {claim.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setHandoverClaim(claim)}
                      className="text-xs"
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1" />
                      Handover OTP
                    </Button>
                  )}

                  <Link href={`/claims/${claim.id}`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      View Details & Audit <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Claims Found"
          description={
            activeTab === 'submitted'
              ? 'You have not submitted any ownership claims yet.'
              : 'No one has filed an ownership claim for your found items yet.'
          }
          actionLabel="Browse Directory"
          onAction={() => (window.location.href = '/discover')}
        />
      )}

      {/* Handover Modal */}
      {handoverClaim && (
        <HandoverModal
          claim={handoverClaim}
          isOpen={true}
          onClose={() => setHandoverClaim(null)}
          onHandoverCompleted={fetchClaims}
        />
      )}
    </div>
  );
}

export default function ClaimsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading claims ledger...</div>}>
      <ClaimsContent />
    </Suspense>
  );
}
