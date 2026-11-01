'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types/user';
import { College, Campus } from '@/types/college';
import { MOCK_COLLEGES } from '@/data/colleges';
import { MOCK_USERS } from '@/data/mockData';
import {
  initStore,
  getActiveUserId,
  setActiveUserId,
  getActiveCollegeId,
  setActiveCollegeId,
  subscribeToStore,
  resetDemoStore,
} from '@/lib/storage/localStore';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  activeCollege: College;
  activeCampus: Campus | null;
  allColleges: College[];
  isDemoMode: boolean;
  switchUser: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  switchCollege: (collegeId: string) => void;
  switchCampus: (campusId: string) => void;
  loginAs: (email: string) => boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    collegeId: string;
    studentId?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  resetDemoData: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(MOCK_USERS[0]);
  const [activeCollege, setActiveCollege] = useState<College>(MOCK_COLLEGES[0]);
  const [activeCampus, setActiveCampus] = useState<Campus | null>(MOCK_COLLEGES[0].campuses[0]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Checks server session on mount
  const checkServerSession = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const u = data.user;
          const userCollegeMembership = u.memberships?.[0];
          const foundCollege = MOCK_COLLEGES.find((c) => c.id === userCollegeMembership?.collegeId) || MOCK_COLLEGES[0];

          setCurrentUser({
            id: u.id,
            name: u.name,
            email: u.email,
            avatarUrl: u.image || undefined,
            role: (u.role === 'PLATFORM_ADMIN'
              ? 'platform_admin'
              : u.role === 'COLLEGE_ADMIN' || u.role === 'COLLEGE_MODERATOR'
              ? 'college_admin'
              : 'student') as UserRole,
            collegeId: foundCollege.id,
            campusId: foundCollege.campuses[0]?.id,
            isVerified: Boolean(u.emailVerified),
            joinedAt: new Date().toISOString(),
          });
          setActiveCollege(foundCollege);
          setActiveCampus(foundCollege.campuses[0] || null);
          setIsDemoMode(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not verify server session, using local store:', e);
    }
  };

  useEffect(() => {
    initStore();
    setIsInitialized(true);

    const updateFromStorage = () => {
      const uId = getActiveUserId();
      const cId = getActiveCollegeId();

      const foundUser = MOCK_USERS.find((u) => u.id === uId) || MOCK_USERS[0];
      const foundCollege = MOCK_COLLEGES.find((c) => c.id === cId) || MOCK_COLLEGES[0];

      setCurrentUser(foundUser);
      setActiveCollege(foundCollege);

      if (foundUser.campusId) {
        const camp = foundCollege.campuses.find((c) => c.id === foundUser.campusId);
        setActiveCampus(camp || foundCollege.campuses[0]);
      } else {
        setActiveCampus(foundCollege.campuses[0]);
      }
    };

    checkServerSession().then(() => {
      // If no server user was loaded, sync from local storage
      if (!currentUser || currentUser.id === 'user-maya') {
        updateFromStorage();
      }
    });

    const unsubscribe = subscribeToStore(updateFromStorage);
    return () => unsubscribe();
  }, []);

  const switchUser = (userId: string) => {
    const targetUser = MOCK_USERS.find((u) => u.id === userId);
    if (targetUser) {
      setActiveUserId(targetUser.id);
      setActiveCollegeId(targetUser.collegeId);
      setCurrentUser(targetUser);

      const targetCollege = MOCK_COLLEGES.find((c) => c.id === targetUser.collegeId) || MOCK_COLLEGES[0];
      setActiveCollege(targetCollege);
      if (targetUser.campusId) {
        const camp = targetCollege.campuses.find((c) => c.id === targetUser.campusId);
        setActiveCampus(camp || targetCollege.campuses[0]);
      }
      setIsDemoMode(true);
    }
  };

  const switchRole = (newRole: UserRole) => {
    const roleUser = MOCK_USERS.find((u) => u.role === newRole);
    if (roleUser) {
      switchUser(roleUser.id);
    }
  };

  const switchCollege = (collegeId: string) => {
    const col = MOCK_COLLEGES.find((c) => c.id === collegeId);
    if (col) {
      setActiveCollege(col);
      setActiveCollegeId(col.id);
      setActiveCampus(col.campuses[0] || null);
    }
  };

  const switchCampus = (campusId: string) => {
    const camp = activeCollege.campuses.find((c) => c.id === campusId);
    if (camp) {
      setActiveCampus(camp);
    }
  };

  const loginAs = (email: string) => {
    const found = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      switchUser(found.id);
      return true;
    }
    return false;
  };

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password || 'Password123!' }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      await checkServerSession();
      return { success: true };
    } catch {
      // Fallback to local loginAs
      const ok = loginAs(email);
      if (ok) return { success: true };
      return { success: false, error: 'Network error connecting to backend' };
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    collegeId: string;
    studentId?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Registration failed' };
      }

      await checkServerSession();
      return { success: true };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  };

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    switchUser('user-maya');
  };

  const resetDemoData = () => {
    resetDemoStore();
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        role: currentUser?.role || 'student',
        activeCollege,
        activeCampus,
        allColleges: MOCK_COLLEGES,
        isDemoMode,
        switchUser,
        switchRole,
        switchCollege,
        switchCampus,
        loginAs,
        login,
        register,
        logout,
        resetDemoData,
        refreshUser: checkServerSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
