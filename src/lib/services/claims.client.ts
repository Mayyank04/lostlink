import { ClaimRequest, ClaimStatus } from '@/types/claim';
import { ItemCategory } from '@/types/report';
import { getStoredClaims, saveClaim } from '@/lib/storage/localStore';
import { ReportService } from './items.client';

const isDemoAllowed = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Claim Service: Manages ownership verification claims
 */
export const ClaimService = {
  async getClaims(filter?: {
    claimantId?: string;
    finderId?: string;
    collegeId?: string;
    status?: ClaimStatus;
  }): Promise<ClaimRequest[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.collegeId && filter.collegeId !== 'all') params.append('collegeId', filter.collegeId);
      const res = await fetch(`/api/claims?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.claims && Array.isArray(data.claims)) {
          const mapped: ClaimRequest[] = data.claims.map((c: any) => ({
            id: c.id,
            referenceNumber: c.itemReportNumber || `CLM-${c.id.slice(0, 8)}`,
            reportId: c.itemId,
            report: {
              id: c.itemId,
              referenceNumber: c.itemReportNumber,
              type: 'found',
              title: c.itemTitle,
              category: (c.itemCategory?.toLowerCase() || 'other') as ItemCategory,
              color: 'Various',
              publicDescription: '',
              collegeId: filter?.collegeId || 'college-apex',
              campusId: '',
              locationBuilding: c.campusName || 'Campus',
              dateOccurred: c.createdAt.split('T')[0],
              images: c.itemImageUrl ? [c.itemImageUrl] : [],
              reporterId: c.reporterId,
              reporterName: c.reporterName,
              reporterEmail: 'finder@university.edu',
              status: 'pending_claim',
              moderationStatus: 'approved',
              viewsCount: 1,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
            },
            claimantId: c.claimantId,
            claimantName: c.claimantName,
            claimantEmail: c.claimantEmail,
            finderId: c.reporterId,
            finderName: c.reporterName,
            collegeId: filter?.collegeId || 'college-apex',
            campusId: '',
            answers: [],
            additionalProofNotes: c.verificationNotes,
            status: (c.status?.toLowerCase() || 'pending') as ClaimStatus,
            timeline: [
              {
                id: `tl-${c.id}`,
                timestamp: c.createdAt,
                actorName: c.claimantName,
                actorRole: 'claimant',
                action: 'Ownership claim submitted with verification evidence',
              },
            ],
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          }));
          return mapped;
        }
      }
    } catch {
      // Fallback
    }

    const all = getStoredClaims();
    return all.filter((claim) => {
      if (filter?.claimantId && claim.claimantId !== filter.claimantId) return false;
      if (filter?.finderId && claim.finderId !== filter.finderId) return false;
      if (filter?.collegeId && filter.collegeId !== 'all' && claim.collegeId !== filter.collegeId) return false;
      if (filter?.status && claim.status !== filter.status) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getClaimById(id: string): Promise<ClaimRequest | null> {
    try {
      const res = await fetch(`/api/claims/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.claim) {
          const c = data.claim;
          const statusMap: Record<string, ClaimStatus> = {
            PENDING: 'pending',
            UNDER_REVIEW: 'under_review',
            APPROVED: 'approved',
            HANDOVER_PENDING: 'approved',
            RETURNED: 'completed',
            COMPLETED: 'completed',
            REJECTED: 'rejected',
            CANCELLED: 'rejected',
            DISPUTED: 'under_review',
          };

          const claimReq: ClaimRequest = {
            id: c.id,
            referenceNumber: c.referenceNumber,
            reportId: c.itemId,
            report: {
              id: c.itemId,
              referenceNumber: c.itemReportNumber,
              type: 'found',
              title: c.itemTitle,
              category: (c.itemCategory?.toLowerCase() || 'other') as ItemCategory,
              color: 'Various',
              publicDescription: '',
              collegeId: c.collegeId,
              campusId: '',
              locationBuilding: c.campusName || 'Campus',
              dateOccurred: c.createdAt.split('T')[0],
              images: c.itemImageUrl ? [c.itemImageUrl] : [],
              reporterId: c.reporterId,
              reporterName: c.reporterName,
              reporterEmail: 'custodian@university.edu',
              status: c.status === 'RETURNED' ? 'returned' : 'pending_claim',
              moderationStatus: 'approved',
              viewsCount: 1,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
            },
            claimantId: c.claimantId,
            claimantName: c.claimantName,
            claimantEmail: c.claimantEmail,
            finderId: c.reporterId,
            finderName: c.reporterName,
            collegeId: c.collegeId,
            campusId: '',
            answers: Array.isArray(c.evidenceDetails?.answers) ? c.evidenceDetails.answers : [],
            additionalProofNotes: c.additionalProofNotes,
            status: statusMap[c.status] || 'pending',
            handover: c.handoverChallenge
              ? {
                  handoverLocation: c.handoverChallenge.handoverLocation || 'Campus Lost & Found Office',
                  secretVerificationCode: c.handoverCode || '******',
                  claimantConfirmed: Boolean(c.handoverChallenge.confirmedAt),
                  finderConfirmed: Boolean(c.handoverChallenge.confirmedAt),
                  completedAt: c.handoverChallenge.confirmedAt,
                }
              : undefined,
            timeline: Array.isArray(c.statusHistory) && c.statusHistory.length > 0
              ? c.statusHistory.map((h: any) => ({
                  id: h.id,
                  timestamp: h.createdAt,
                  actorName: h.actorName,
                  actorRole: 'campus_admin',
                  action: `Status transitioned to ${h.toStatus}`,
                  notes: h.notes,
                }))
              : [
                  {
                    id: `tl-${c.id}`,
                    timestamp: c.createdAt,
                    actorName: c.claimantName,
                    actorRole: 'claimant',
                    action: 'Claim submitted with verification evidence',
                  },
                ],
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          };
          saveClaim(claimReq);
          return claimReq;
        }
      }
    } catch {
      // Fallback
    }

    const all = getStoredClaims();
    return all.find((c) => c.id === id) || null;
  },

  async submitClaim(claim: ClaimRequest): Promise<ClaimRequest> {
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: claim.reportId,
          verificationNotes: claim.additionalProofNotes || 'Ownership proof submitted',
          evidenceDetails: {
            answers: claim.answers,
          },
          evidenceFileUrl: claim.uploadedProofUrls?.[0] || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit ownership claim to server');
      }

      if (data.claim) {
        claim.id = data.claim.id;
        claim.referenceNumber = data.claim.referenceNumber;
      }

      saveClaim(claim);
      return claim;
    } catch (e: any) {
      if (!isDemoAllowed) {
        throw e;
      }
      console.warn('Backend claim error, falling back locally in demo mode:', e);
      saveClaim(claim);
      await ReportService.updateReport(claim.reportId, { status: 'pending_claim' });
      return claim;
    }
  },

  async updateClaimStatus(
    claimId: string,
    newStatus: ClaimStatus,
    actorName: string,
    actorRole: 'claimant' | 'finder' | 'campus_admin',
    notes?: string
  ): Promise<ClaimRequest | null> {
    try {
      const backendStatus = newStatus === 'approved' || newStatus === 'completed' ? 'APPROVED' : 'REJECTED';
      const res = await fetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: backendStatus,
          reviewNotes: notes,
        }),
      });

      if (!res.ok && !isDemoAllowed) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update claim status on server');
      }
    } catch (e: any) {
      if (!isDemoAllowed) throw e;
    }

    const claim = await this.getClaimById(claimId);
    if (!claim) return null;

    claim.status = newStatus;
    claim.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName,
      actorRole,
      action: `Claim status changed to "${newStatus.replace('_', ' ').toUpperCase()}"`,
      notes,
    });

    if (newStatus === 'completed') {
      await ReportService.updateReport(claim.reportId, { status: 'returned' });
    } else if (newStatus === 'rejected') {
      await ReportService.updateReport(claim.reportId, { status: 'active' });
    }

    saveClaim(claim);
    return claim;
  },

  async confirmHandover(
    claimId: string,
    role: 'claimant' | 'finder' | 'admin',
    verificationCodeInput?: string
  ): Promise<{ success: boolean; message: string; claim?: ClaimRequest }> {
    try {
      // First ensure a challenge exists
      await fetch('/api/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId }),
      });

      const res = await fetch(`/api/handovers/${claimId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verificationCodeInput,
          moderatorOverride: role === 'admin',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          message: data.error || 'Handover verification failed',
        };
      }

      const updated = await this.getClaimById(claimId);
      return {
        success: true,
        message: data.message || 'Handover successfully verified.',
        claim: updated || undefined,
      };
    } catch (e: any) {
      if (!isDemoAllowed) {
        return {
          success: false,
          message: e.message || 'Network error communicating with handover verification service',
        };
      }
      console.warn('Backend handover confirmation error, falling back locally in demo mode:', e);

      const claim = await this.getClaimById(claimId);
      if (!claim || !claim.handover) {
        return { success: false, message: 'Handover details not found.' };
      }

      if (role === 'claimant') {
        claim.handover.claimantConfirmed = true;
      } else {
        if (verificationCodeInput && verificationCodeInput !== claim.handover.secretVerificationCode) {
          return { success: false, message: 'Verification exchange code does not match.' };
        }
        claim.handover.finderConfirmed = true;
      }

      if (claim.handover.claimantConfirmed && claim.handover.finderConfirmed) {
        claim.status = 'completed';
        claim.handover.completedAt = new Date().toISOString();
        await ReportService.updateReport(claim.reportId, { status: 'returned' });
      }

      saveClaim(claim);
      return { success: true, message: 'Demo Handover confirmed.', claim };
    }
  },
};
