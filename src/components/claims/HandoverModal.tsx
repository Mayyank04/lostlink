'use client';

import React, { useState } from 'react';
import { ClaimRequest } from '@/types/claim';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ClaimService } from '@/lib/services/api';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, KeyRound, MapPin, Clock, AlertTriangle } from 'lucide-react';

interface HandoverModalProps {
  claim: ClaimRequest;
  isOpen: boolean;
  onClose: () => void;
  onHandoverCompleted?: () => void;
}

export const HandoverModal: React.FC<HandoverModalProps> = ({
  claim,
  isOpen,
  onClose,
  onHandoverCompleted,
}) => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isClaimant = user?.id === claim.claimantId;
  const isFinder = user?.id === claim.finderId;
  const isAdmin = user?.role === 'college_admin' || user?.role === 'platform_admin';

  // Prevent unauthorized self-approvals
  const canConfirmAsFinderOrAdmin = isFinder || isAdmin;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      if (isClaimant) {
        const res = await ClaimService.confirmHandover(claim.id, 'claimant');
        if (res.success) {
          success('Handover Receipt Acknowledged', 'You confirmed physical possession of your item.');
          onHandoverCompleted?.();
          onClose();
        } else {
          error('Confirmation Failed', res.message);
        }
      } else if (canConfirmAsFinderOrAdmin) {
        const role = isAdmin ? 'admin' : 'finder';
        const res = await ClaimService.confirmHandover(claim.id, role, code);
        if (res.success) {
          success('Return Finalized', 'The item has been officially marked as returned!');
          onHandoverCompleted?.();
          onClose();
        } else {
          error('Code Verification Failed', res.message);
        }
      }
    } catch (e) {
      error('Error', 'Unable to complete handover confirmation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure Item Handover Confirmation"
      description={`Reference: ${claim.referenceNumber} • ${claim.report.title}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Handover Location Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <MapPin className="w-4 h-4 text-brandTeal-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">Campus Custody Desk</p>
              <p className="text-slate-600 dark:text-slate-400">
                {claim.handover?.handoverLocation || 'Campus Lost & Found Central Office'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <Clock className="w-4 h-4 text-brandBlue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">Recommended Time Window</p>
              <p className="text-slate-600 dark:text-slate-400">
                Operating hours (Mon - Fri 8:00 AM - 6:00 PM)
              </p>
            </div>
          </div>
        </div>

        {/* Secret Verification Code Display / Input */}
        {isClaimant ? (
          <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2 text-center">
            <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">
              Your 6-Digit Exchange Code
            </p>
            <div className="font-mono text-3xl font-black tracking-widest text-brandTeal-700 dark:text-brandTeal-300">
              {claim.handover?.secretVerificationCode || '749218'}
            </div>
            <p className="text-[11px] text-teal-700/80 dark:text-teal-400 leading-relaxed max-w-sm mx-auto">
              Show this code to the campus desk attendant or finder upon physically inspecting and receiving your belongings.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              label="Enter Claimant's 6-Digit Handover Code"
              placeholder="e.g. 749218"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              helperText={`Claimant will provide this code during in-person pickup (Hint: ${claim.handover?.secretVerificationCode})`}
            />
          </div>
        )}

        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-brandTeal-600 shrink-0 mt-0.5" />
          <span>
            Both parties or an authorized campus officer must confirm physical handover to complete the custody chain and archive the report.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            disabled={!isClaimant && !isAdmin && code.trim().length === 0}
          >
            Confirm Handover Complete
          </Button>
        </div>
      </div>
    </Modal>
  );
};

