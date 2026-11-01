'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { MOCK_USERS } from '@/data/mockData';
import { ShieldAlert, UserCheck, RefreshCw, KeyRound } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { user, switchUser, resetDemoData } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors shadow-xs"
        title="Switch Demo Persona & Role"
      >
        <KeyRound className="w-3 h-3 text-amber-700 dark:text-amber-300" />
        <span>Demo: {user?.name.split(' ')[0]} ({user?.role.replace('_', ' ')})</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-3 animate-slide-down">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Switch Demo Role</p>
              <p className="text-[10px] text-slate-500">Test different permission scopes</p>
            </div>
            <button
              onClick={() => {
                resetDemoData();
                setIsOpen(false);
              }}
              className="text-[10px] text-brandTeal-600 hover:underline flex items-center gap-1"
              title="Reset items and claims back to factory fixtures"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Reset Data
            </button>
          </div>

          <div className="space-y-1.5">
            {MOCK_USERS.map((u) => {
              const isSelected = u.id === user?.id;
              const roleBadgeColor = {
                student: 'bg-emerald-100 text-emerald-800',
                college_admin: 'bg-blue-100 text-blue-800',
                platform_admin: 'bg-purple-100 text-purple-800',
              }[u.role];

              return (
                <button
                  key={u.id}
                  onClick={() => {
                    switchUser(u.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{u.name}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{u.email}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${roleBadgeColor}`}>
                    {u.role.replace('_', ' ')}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
            Note: Demo persistence uses local browser storage. Ready for hybrid-cloud Kubernetes backend.
          </div>
        </div>
      )}
    </div>
  );
};

