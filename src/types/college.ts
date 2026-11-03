export interface CampusLocation {
  id: string;
  name: string;
  type: 'building' | 'library' | 'sports_complex' | 'canteen' | 'hostel' | 'lab' | 'outdoor' | 'office';
  description?: string;
  hasLostFoundDesk?: boolean;
}

export interface Campus {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  lostFoundOffice: {
    room: string;
    contactEmail: string;
    operatingHours: string;
  };
  locations: CampusLocation[];
}

export interface College {
  id: string;
  name: string;
  shortName?: string | null;
  slug?: string;
  domain: string;
  emailDomains?: string[];
  logoUrl?: string | null;
  primaryColor?: string;
  city?: string;
  state: string;
  country: string;
  campuses: Campus[];
  activeUsersCount?: number;
  totalRecoveries?: number;
  isVerified?: boolean;
  contactEmail?: string;
  supportPhone?: string | null;
  stats?: {
    activeItems?: number;
    activeMembers?: number;
  };
}

export function getCollegeShortName(col?: Partial<College> | null): string {
  if (!col) return 'Campus';
  return col.shortName?.trim() || col.name?.trim() || 'Campus';
}

export function getCollegeInitial(col?: Partial<College> | null): string {
  if (!col) return 'C';
  const candidate = col.shortName?.trim() || col.name?.trim() || 'C';
  return candidate.charAt(0).toUpperCase();
}

