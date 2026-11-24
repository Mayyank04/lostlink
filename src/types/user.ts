export type UserRole = 'student' | 'college_moderator' | 'college_admin' | 'platform_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  collegeId: string;
  campusId?: string;
  studentIdNumber?: string;
  department?: string;
  graduationYear?: number;
  phone?: string;
  isVerified: boolean;
  joinedAt: string;
  isOnboarded?: boolean;
  studentProfile?: {
    id: string;
    studentIdNumber: string | null;
    course: string;
    department: string;
    batch: string;
    admissionYear: number;
    currentYear: number;
    section: string | null;
    semester?: number | null;
    phoneNumber?: string | null;
    avatarUrl?: string | null;
    isOnboardingDone?: boolean;
  } | null;
}

