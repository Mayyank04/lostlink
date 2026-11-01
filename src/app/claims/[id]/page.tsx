'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ClaimRequest, ClaimStatus } from '@/types/claim';
import { ClaimService } from '@/lib/services/api';
import { ClaimStatusTimeline } from '@/components/claims/ClaimStatusTimeline';
import { HandoverModal } from '@/components/claims/HandoverModal';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  KeyRound,
  ArrowLeft,
  UserCheck,
  Building,
  MapPin,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();
  const { success, error } = useToast();

  const [claim, setClaim] = useState<ClaimRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadClaim = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await ClaimService.getClaimById(id);
      setClaim(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClaim();
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-12 max-w-3xl text-center">
        <div className="w-10 h-10 border-4 border-brandTeal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading claim audit record...</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-md text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Claim Not Found</h2>
        <p className="text-xs text-slate-500">The requested claim record does not exist or has been removed.</p>
        <Link href="/claims">
          <Button size="sm" variant="primary">Return to Claims</Button>
        </Link>
      </div>
    );
  }

  const isClaimant = user?.id === claim.claimantId;
  const isFinder = user?.id === claim.finderId;
  const isAdmin = user?.role === 'college_admin' || user?.role === 'platform_admin';

  // Authorization rule: Claimant cannot approve or reject their own claim
  const canDecide = (isFinder || isAdmin) && !isClaimant;

  const handleApprove = async () => {
    setIsUpdating(true);
    try {
      const actorRole = isAdmin ? 'campus_admin' : 'finder';
      const actorName = user?.name || (isAdmin ? 'Campus Admin' : 'Finder');
      await ClaimService.updateClaimStatus(
        claim.id,
        'approved',
        actorName,
        actorRole,
        'Verification answers confirmed to match item. Handover exchange scheduled.'
      );
      success('Claim Approved', 'The claimant has been notified to pick up the item.');
      loadClaim();
    } catch (e) {
      error('Error', 'Unable to approve claim.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    setIsUpdating(true);
    try {
      const actorRole = isAdmin ? 'campus_admin' : 'finder';
      const actorName = user?.name || (isAdmin ? 'Campus Admin' : 'Finder');
      await ClaimService.updateClaimStatus(
        claim.id,
        'rejected',
        actorName,
        actorRole,
        rejectReason || 'Ownership answers did not match unique markings.'
      );
      success('Claim Rejected', 'The claim has been declined.');
      setRejectModalOpen(false);
      loadClaim();
    } catch (e) {
      error('Error', 'Unable to reject claim.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/claims"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Claims
        </Link>
        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
          {claim.referenceNumber}
        </span>
      </div>

      {/* Claim Overview Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brandTeal-600">
              Claim Verification Case
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {claim.report?.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Target report: <span className="font-mono text-slate-700 dark:text-slate-300">{claim.report?.referenceNumber}</span> • {claim.report?.locationBuilding}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {claim.status === 'approved' && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setHandoverModalOpen(true)}
                className="text-xs font-bold"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1" />
                Handover Verification Code
              </Button>
            )}

            {canDecide && (claim.status === 'pending' || claim.status === 'under_review') && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectModalOpen(true)}
                  className="text-xs text-rose-600 hover:bg-rose-50"
                  disabled={isUpdating}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleApprove}
                  className="text-xs font-bold"
                  isLoading={isUpdating}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve Ownership
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Roles Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Claimant (Alleged Owner):</span>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{claim.claimantName}</p>
            <p className="text-slate-500">{claim.claimantEmail}</p>
            {claim.claimantStudentId && (
              <p className="text-[11px] text-slate-400">Student ID: {claim.claimantStudentId}</p>
            )}
          </div>
          <div>
            <span className="text-slate-400 font-medium">Finder / Custodian:</span>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{claim.finderName}</p>
            <p className="text-slate-500">
              Campus Facility: {claim.report?.locationBuilding}
            </p>
          </div>
        </div>

        {/* Verification Answers Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Ownership Proof Answers
          </h3>

          <div className="space-y-3">
            {claim.answers.map((ans, idx) => (
              <div
                key={ans.questionId}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-1.5"
              >
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {idx + 1}. {ans.question}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 font-mono leading-relaxed">
                  &ldquo;{ans.answer}&rdquo;
                </p>
              </div>
            ))}
          </div>

          {claim.additionalProofNotes && (
            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Additional Proof & Notes:
              </span>
              <p className="text-slate-600 dark:text-slate-400">{claim.additionalProofNotes}</p>
            </div>
          )}
        </div>

        {/* Handover Details if Scheduled */}
        {claim.handover && (
          <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-600" />
                Custody Handover Location
              </span>
              <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                {claim.handover.claimantConfirmed && claim.handover.finderConfirmed
                  ? 'Completed'
                  : 'Pending Handover'}
              </span>
            </div>
            <p className="text-teal-800 dark:text-teal-300">{claim.handover.handoverLocation}</p>
            {isClaimant && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-teal-300 dark:border-teal-700 text-center">
                <p className="text-[11px] text-slate-500">Your Handover Exchange Code</p>
                <p className="font-mono text-2xl font-black text-brandTeal-700 dark:text-brandTeal-300 tracking-widest mt-1">
                  {claim.handover.secretVerificationCode}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Audit Timeline */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <ClaimStatusTimeline timeline={claim.timeline} currentStatus={claim.status} />
        </div>
      </div>

      {/* Handover Modal */}
      {handoverModalOpen && (
        <HandoverModal
          claim={claim}
          isOpen={handoverModalOpen}
          onClose={() => setHandoverModalOpen(false)}
          onHandoverCompleted={loadClaim}
        />
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Ownership Claim"
        description="Provide a constructive reason explaining why proof is insufficient."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Rejection Reason *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Unique markings described do not match physical laptop stickers..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              isLoading={isUpdating}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
