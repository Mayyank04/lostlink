import { ItemReport } from './report';

export type ClaimStatus =
  | 'pending' // Claim submitted by claimant, awaiting finder/admin review
  | 'under_review' // Being inspected / questions asked
  | 'approved' // Finder or Admin verified ownership answers
  | 'rejected' // Rejected due to incorrect proof
  | 'completed'; // Handover confirmed, item returned

export interface VerificationAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface ClaimTimelineEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: 'claimant' | 'finder' | 'campus_admin';
  action: string;
  notes?: string;
}

export interface HandoverDetails {
  handoverLocation: string; // e.g. "North Campus Lost & Found Office (Rm 102)"
  handoverTime?: string;
  secretVerificationCode: string; // 6-digit handover exchange code
  claimantConfirmed: boolean;
  finderConfirmed: boolean;
  completedAt?: string;
}

export interface ClaimRequest {
  id: string;
  referenceNumber: string; // e.g. "CLM-2026-4419"
  reportId: string; // The found item report being claimed
  report: ItemReport;
  claimantId: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone?: string;
  claimantStudentId?: string;

  finderId: string;
  finderName: string;

  collegeId: string;
  campusId: string;

  answers: VerificationAnswer[];
  additionalProofNotes?: string;
  uploadedProofUrls?: string[];

  status: ClaimStatus;
  rejectionReason?: string;
  adminReviewNotes?: string;

  handover?: HandoverDetails;
  timeline: ClaimTimelineEvent[];

  createdAt: string;
  updatedAt: string;
}

