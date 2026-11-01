export type UserRole = 'student' | 'college_admin' | 'platform_admin';

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
}

