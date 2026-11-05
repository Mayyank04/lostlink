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
  serverAuthenticated: boolean;
  switchUser: (userId: string) => void | Promise<void>;
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
  logout: () => void | Promise<void>;
  resetDemoData: () => void;
  refreshUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDemoAllowed = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [collegesList, setCollegesList] = useState<College[]>(MOCK_COLLEGES);
  const [activeCollege, setActiveCollege] = useState<College>(MOCK_COLLEGES[0]);
  const [activeCampus, setActiveCampus] = useState<Campus | null>(MOCK_COLLEGES[0].campuses[0]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [serverAuthenticated, setServerAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Checks genuine server session via /api/auth/me
  const checkServerSession = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const u = data.user;
          const userCollegeMembership = u.memberships?.[0];
          const foundCollege = collegesList.find((c) => c.id === userCollegeMembership?.collegeId) || MOCK_COLLEGES[0];

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
          setServerAuthenticated(true);
          return true;
        }
      }
    } catch (e) {
      console.warn('Could not verify server session:', e);
    }
    setServerAuthenticated(false);
    return false;
  };

  useEffect(() => {
    initStore();
    setIsInitialized(true);

    const updateFromStorage = () => {
      const uId = getActiveUserId();
      const cId = getActiveCollegeId();

      const foundUser = MOCK_USERS.find((u) => u.id === uId) || MOCK_USERS[0];
      const foundCollege = collegesList.find((c) => c.id === cId) || MOCK_COLLEGES.find((c) => c.id === cId) || MOCK_COLLEGES[0];

      setCurrentUser(foundUser);
      setActiveCollege(foundCollege);

      if (foundUser.campusId) {
        const camp = foundCollege.campuses?.find((c) => c.id === foundUser.campusId);
        setActiveCampus(camp || foundCollege.campuses?.[0] || null);
      } else {
        setActiveCampus(foundCollege.campuses?.[0] || null);
      }
    };

    // Load dynamic active colleges from PostgreSQL database
    fetch('/api/colleges')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.colleges && data.colleges.length > 0) {
          setCollegesList(data.colleges);
        }
      })
      .catch(() => {});

    checkServerSession().then((hasServerSession) => {
      if (!hasServerSession) {
        if (isDemoAllowed) {
          const uId = getActiveUserId();
          if (uId === 'user-platform-admin') {
            setActiveUserId('user-maya');
            setCurrentUser(MOCK_USERS[0]);
          } else {
            updateFromStorage();
          }
          setIsDemoMode(true);
        } else {
          setCurrentUser(null);
          setIsDemoMode(false);
          setServerAuthenticated(false);
        }
      }
    });

    const unsubscribe = subscribeToStore(updateFromStorage);
    return () => unsubscribe();
  }, []);

  const switchUser = async (userId: string) => {
    if (!isDemoAllowed) {
      console.warn('Identity switching is disabled in production.');
      return;
    }
    const targetUser = MOCK_USERS.find((u) => u.id === userId);
    if (!targetUser) return;

    setActiveUserId(targetUser.id);
    setActiveCollegeId(targetUser.collegeId);
    setCurrentUser(targetUser);

    const targetCollege = collegesList.find((c) => c.id === targetUser.collegeId) || MOCK_COLLEGES.find((c) => c.id === targetUser.collegeId) || MOCK_COLLEGES[0];
    setActiveCollege(targetCollege);
    if (targetUser.campusId) {
      const camp = targetCollege.campuses?.find((c) => c.id === targetUser.campusId);
      setActiveCampus(camp || targetCollege.campuses?.[0] || null);
    }

    // Attempt real backend authentication for seed personas
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetUser.email, password: 'Password123!' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          await checkServerSession();
          return;
        }
      }
    } catch {
      // Offline fallback
    }

    // Fallback to local demo mode if backend is unreachable
    setIsDemoMode(true);
    setServerAuthenticated(false);
  };

  const switchRole = (newRole: UserRole) => {
    const roleUser = MOCK_USERS.find((u) => u.role === newRole);
    if (roleUser) {
      switchUser(roleUser.id);
    }
  };

  const switchCollege = (collegeId: string) => {
    const col = collegesList.find((c) => c.id === collegeId) || MOCK_COLLEGES.find((c) => c.id === collegeId);
    if (col) {
      setActiveCollege(col);
      setActiveCollegeId(col.id);
      setActiveCampus(col.campuses?.[0] || null);
    }
  };

  const switchCampus = (campusId: string) => {
    const camp = activeCollege.campuses?.find((c) => c.id === campusId);
    if (camp) {
      setActiveCampus(camp);
    }
  };

  const loginAs = (email: string) => {
    if (!isDemoAllowed) {
      console.warn('loginAs simulation is disabled in production.');
      return false;
    }
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
      return { success: false, error: 'Network error connecting to backend authentication server' };
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

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setActiveUserId('user-maya');
    setCurrentUser(null);
    setServerAuthenticated(false);
    setIsDemoMode(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
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
        allColleges: collegesList,
        isDemoMode,
        serverAuthenticated,
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
