'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { School, ChevronDown, Check } from 'lucide-react';

interface CollegeSwitcherProps {
  compact?: boolean;
}

export const CollegeSwitcher: React.FC<CollegeSwitcherProps> = ({ compact = false }) => {
  const { activeCollege, allColleges, switchCollege, activeCampus, switchCampus } = useAuth();
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left text-xs font-medium text-slate-800 dark:text-slate-200 shadow-sm"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title="Switch Campus/College Scope"
      >
        <div className="w-5 h-5 rounded-full bg-brandTeal-100 dark:bg-brandTeal-950 flex items-center justify-center text-brandTeal-700 dark:text-brandTeal-300 shrink-0">
          <School className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col text-left">
          <span className="font-semibold truncate max-w-[150px]">
            {compact ? (activeCollege.shortName || activeCollege.name) : activeCollege.name}
          </span>
          {activeCampus && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
              {activeCampus.name?.split('(')[0] || 'Campus'}
            </span>
          )}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-2 animate-slide-down">
          <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Select University Campus
          </div>
          <div className="max-h-60 overflow-y-auto">
            {allColleges.map((college) => {
              const isSelected = college.id === activeCollege.id;
              return (
                <div key={college.id} className="border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                  <button
                    onClick={() => {
                      switchCollege(college.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      isSelected ? 'bg-brandTeal-50/50 dark:bg-brandTeal-950/20 font-semibold text-brandTeal-800 dark:text-brandTeal-300' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{college.name}</p>
                      <p className="text-[10px] text-slate-400">{college.state || 'Federated'}, {(college.campuses || []).length} Campuses</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-brandTeal-600" />}
                  </button>

                  {/* Campus sub-options if selected */}
                  {isSelected && (
                    <div className="pl-6 pr-3 py-1 bg-slate-50/70 dark:bg-slate-800/40 space-y-1">
                      {college.campuses.map((camp) => (
                        <button
                          key={camp.id}
                          onClick={() => {
                            switchCampus(camp.id);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left py-1 px-2 rounded text-[11px] flex items-center justify-between ${
                            activeCampus?.id === camp.id
                              ? 'text-brandTeal-700 dark:text-brandTeal-300 font-semibold bg-white dark:bg-slate-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <span className="truncate">{camp.name}</span>
                          {activeCampus?.id === camp.id && <span className="w-1.5 h-1.5 rounded-full bg-brandTeal-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

