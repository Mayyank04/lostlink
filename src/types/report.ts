export type ReportType = 'lost' | 'found';

export type ItemCategory =
  | 'electronics'
  | 'id_cards'
  | 'keys'
  | 'bags'
  | 'clothing'
  | 'books'
  | 'accessories'
  | 'water_bottles'
  | 'other';

export type ItemStatus =
  | 'active'
  | 'matched'
  | 'pending_claim'
  | 'returned'
  | 'closed';

export type ModerationStatus = 'approved' | 'flagged' | 'under_review' | 'removed';

export interface ItemReport {
  id: string;
  referenceNumber: string; // e.g. "LL-2026-8812"
  type: ReportType;
  title: string;
  category: ItemCategory;
  brand?: string;
  color: string;
  secondaryColor?: string;
  publicDescription: string;
  
  // Location and Time
  collegeId: string;
  campusId: string;
  locationBuilding: string;
  locationRoomOrSpecifics?: string;
  dateOccurred: string; // YYYY-MM-DD
  timeOccurred?: string; // HH:mm or "Morning", "Afternoon", etc.

  // Media
  images: string[];

  // Safe Public & Office Flags
  finderDepositedWithOffice?: boolean;
  officeLocationNotes?: string;

  // Private verification data (NEVER shown publicly; used only during claim verification)
  privateEvidence?: {
    uniqueIdentifiers?: string; // e.g. Engraved initials, specific scratch, lockscreen image
    serialNumberSnippet?: string; // Last 4 digits
    privateNotes?: string;
    proofOfPurchaseUrl?: string;
  };

  // Reporter Info
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;

  // System & Moderation
  status: ItemStatus;
  moderationStatus: ModerationStatus;
  moderationNotes?: string;
  matchedReportId?: string;
  claimedByUserId?: string;
  claimId?: string;

  viewsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFilterOptions {
  searchQuery?: string;
  type?: 'all' | ReportType;
  collegeId?: string;
  campusId?: string;
  category?: 'all' | ItemCategory;
  color?: string;
  status?: 'all' | ItemStatus;
  dateFrom?: string;
  dateTo?: string;
  depositedAtOfficeOnly?: boolean;
  sortBy?: 'newest' | 'oldest' | 'date_occurred';
}

