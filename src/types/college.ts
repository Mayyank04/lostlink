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
  shortName: string;
  domain: string;
  logoUrl?: string;
  primaryColor?: string;
  state: string;
  country: string;
  campuses: Campus[];
  activeUsersCount: number;
  totalRecoveries: number;
  isVerified: boolean;
  contactEmail: string;
  supportPhone?: string;
}

