'use client';

import React, { useState } from 'react';
import { ItemReport } from '@/types/report';
import { ClaimRequest, VerificationAnswer } from '@/types/claim';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ClaimService } from '@/lib/services/api';
import { generateReferenceNumber } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ClaimFormProps {
  foundReport: ItemReport;
  onSuccess: (claim: ClaimRequest) => void;
  onCancel: () => void;
}

export const ClaimForm: React.FC<ClaimFormProps> = ({
  foundReport,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Self-claim check: A user cannot claim an item they themselves reported found!
  const isReporter = user?.id === foundReport.reporterId;

  if (isReporter) {
    return (
      <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
        <h3 className="text-base font-bold text-amber-900 dark:text-amber-100">
          Cannot Claim Own Found Listing
        </h3>
        <p className="text-xs text-amber-800/90 dark:text-amber-300 max-w-sm mx-auto leading-relaxed">
          You are logged in as the student or custodian who registered this found report. You cannot submit an ownership claim to yourself.
        </p>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Go Back
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q1.trim() || !q2.trim()) {
      setValidationError('Please answer the top two verification questions in detail.');
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    try {
      const answers: VerificationAnswer[] = [
        {
          questionId: 'q1',
          question: 'What distinctive stickers, marks, engravings, or physical scratches are present?',
          answer: q1.trim(),
        },
        {
          questionId: 'q2',
          question: 'What is the device lock screen wallpaper, account name, or secret pocket content?',
          answer: q2.trim(),
        },
      ];

      if (q3.trim()) {
        answers.push({
          questionId: 'q3',
          question: 'Can you provide the serial number snippet, receipt invoice, or purchase store?',
          answer: q3.trim(),
        });
      }

      const newClaim: ClaimRequest = {
        id: `claim-${Date.now()}`,
        referenceNumber: generateReferenceNumber('CLM'),
        reportId: foundReport.id,
        report: foundReport,
        claimantId: user?.id || 'user-maya',
        claimantName: user?.name || 'Maya Lin',
        claimantEmail: user?.email || 'maya.lin@apex.edu',
        claimantPhone: user?.phone,
        claimantStudentId: user?.studentIdNumber,
        finderId: foundReport.reporterId,
        finderName: foundReport.reporterName,
        collegeId: foundReport.collegeId,
        campusId: foundReport.campusId,
        answers,
        additionalProofNotes: additionalNotes.trim() || undefined,
        status: 'pending',
        handover: {
          handoverLocation: foundReport.locationBuilding + ' Custody Desk',
          secretVerificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
          claimantConfirmed: false,
          finderConfirmed: false,
        },
        timeline: [
          {
            id: `tl-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actorName: user?.name || 'Maya Lin',
            actorRole: 'claimant',
            action: 'Ownership verification claim submitted',
            notes: 'Submitted verification answers for custodian review.',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const submitted = await ClaimService.submitClaim(newClaim);
      success(
        'Claim Submitted for Verification',
        `Reference: ${submitted.referenceNumber}. The finder / campus desk will review your answers.`
      );
      onSuccess(submitted);
    } catch (err) {
      error('Claim Submission Error', 'Unable to record your claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200">
        <div className="flex items-center gap-2 font-bold text-xs mb-1">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Zero-Knowledge Proof Verification</span>
        </div>
        <p className="text-[11px] text-teal-800/80 dark:text-teal-300 leading-relaxed">
          To prevent fraudulent claims, describe characteristics only the true owner would know. The finder or campus custodian will evaluate your answers against the physical item.
        </p>
      </div>

      <Textarea
        label="1. Distinctive Physical Marks / Stickers *"
        placeholder="Describe any stickers, scratches, case color, engraved initials, or distinctive wear..."
        rows={3}
        value={q1}
        onChange={(e) => setQ1(e.target.value)}
        helperText="e.g. 'Kubernetes sticker on palm rest, tiny chip on lower left corner'"
      />

      <Textarea
        label="2. Secret Internal Content / Lock Screen Clue *"
        placeholder="Describe the lock screen wallpaper, username, contents of secret pocket, or keychain items..."
        rows={3}
        value={q2}
        onChange={(e) => setQ2(e.target.value)}
        helperText="e.g. 'Wallpaper is a mountain lake at sunset; username is Maya Lin'"
      />

      <Input
        label="3. Serial Number Snippet / Purchase Detail (Optional)"
        placeholder="e.g. S/N ending in 89F2, or purchased at University Tech Store"
        value={q3}
        onChange={(e) => setQ3(e.target.value)}
      />

      <Textarea
        label="Additional Verification Notes (Optional)"
        placeholder="Any additional information to help campus desk authenticate you..."
        rows={2}
        value={additionalNotes}
        onChange={(e) => setAdditionalNotes(e.target.value)}
      />

      {validationError && (
        <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{validationError}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
          Submit Ownership Claim
        </Button>
      </div>
    </form>
  );
};

