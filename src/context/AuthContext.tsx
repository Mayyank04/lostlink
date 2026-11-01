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
  logout: () => void;
  resetDemoData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(MOCK_USERS[0]);
  const [activeCollege, setActiveCollege] = useState<College>(MOCK_COLLEGES[0]);
  const [activeCampus, setActiveCampus] = useState<Campus | null>(MOCK_COLLEGES[0].campuses[0]);
  const [isInitialized, setIsInitialized] = useState(false);

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

    updateFromStorage();
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

  const logout = () => {
    // Return to demo student
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
        isDemoMode: true,
        switchUser,
        switchRole,
        switchCollege,
        switchCampus,
        loginAs,
        logout,
        resetDemoData,
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

