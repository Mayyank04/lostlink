'use client';

import React, { useState, useEffect } from 'react';
import { School, Search, MapPin, CheckCircle2, ChevronRight, X, PlusCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CollegeSearchResult } from './CollegeCard';
import { RequestCollegeModal } from './RequestCollegeModal';
import Link from 'next/link';

interface SearchableCollegeSelectorProps {
  selectedCollegeId: string;
  onSelectCollege: (college: CollegeSearchResult) => void;
  error?: string;
}

export const SearchableCollegeSelector: React.FC<SearchableCollegeSelectorProps> = ({
  selectedCollegeId,
  onSelectCollege,
  error,
}) => {
  const [selectedCollege, setSelectedCollege] = useState<CollegeSearchResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<CollegeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial selected college if ID is present
  useEffect(() => {
    if (selectedCollegeId) {
      fetch(`/api/colleges/search?limit=50`)
        .then((res) => res.json())
        .then((data) => {
          if (data.colleges) {
            const found = data.colleges.find((c: any) => c.id === selectedCollegeId);
            if (found) setSelectedCollege(found);
          }
        })
        .catch(() => {});
    }
  }, [selectedCollegeId]);

  // Live search inside selector modal
  useEffect(() => {
    if (!modalOpen) return;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set('q', searchTerm.trim());
        params.set('limit', '10');

        const res = await fetch(`/api/colleges/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.colleges || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, modalOpen]);

  const handleSelect = (col: CollegeSearchResult) => {
    setSelectedCollege(col);
    onSelectCollege(col);
    setModalOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-between">
        <span>Enrolled College / University *</span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-brandTeal-600 dark:text-brandTeal-400 font-semibold hover:underline text-[11px]"
        >
          {selectedCollege ? 'Change College' : 'Browse All Colleges'}
        </button>
      </label>

      {/* Selected College Preview Card */}
      {selectedCollege ? (
        <div
          onClick={() => setModalOpen(true)}
          className="cursor-pointer p-3 rounded-xl border border-brandTeal-200 dark:border-brandTeal-900 bg-brandTeal-50/50 dark:bg-brandTeal-950/20 hover:border-brandTeal-300 transition-colors flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
              style={{ backgroundColor: selectedCollege.primaryColor || '#0F766E' }}
            >
              {(selectedCollege.shortName || selectedCollege.name).charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {selectedCollege.name}
                </p>
                {selectedCollege.shortName && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {selectedCollege.shortName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {selectedCollege.city}, {selectedCollege.state} • {selectedCollege.country}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-brandTeal-700 dark:text-brandTeal-400">
              Change
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      ) : (
        /* Empty Prompt Button */
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brandTeal-500 bg-slate-50 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 transition-all text-left flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5 text-xs text-slate-500">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search or select your institution...</span>
          </div>
          <span className="text-xs font-bold text-brandTeal-600 dark:text-brandTeal-400">
            Select
          </span>
        </button>
      )}

      {error && <p className="text-[11px] text-rose-600 font-semibold mt-1">{error}</p>}

      {/* Quick Search & Select Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Select Your Enrolled College"
        description="Search across thousands of registered institutions by name, abbreviation, or city."
        maxWidth="md"
      >
        <div className="space-y-3 text-xs">
          {/* Live Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, short code (e.g. 'IILM', 'MIT', 'Sharda')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brandTeal-500"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {isLoading ? (
              <div className="py-8 text-center text-slate-400">Searching institutions...</div>
            ) : results.length > 0 ? (
              results.map((col) => {
                const isCurrent = col.id === selectedCollege?.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleSelect(col)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'border-brandTeal-500 bg-brandTeal-50 dark:bg-brandTeal-950/40 text-brandTeal-900 dark:text-brandTeal-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0"
                        style={{ backgroundColor: col.primaryColor || '#0F766E' }}
                      >
                        {(col.shortName || col.name).charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {col.name}
                          </p>
                          {col.shortName && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {col.shortName}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {col.city}, {col.state} • {col.country}
                        </p>
                      </div>
                    </div>

                    {isCurrent ? (
                      <Check className="w-4 h-4 text-brandTeal-600 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-bold text-brandTeal-600 shrink-0">
                        Select
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center space-y-2">
                <p className="text-slate-500">No institutions found matching &ldquo;{searchTerm}&rdquo;</p>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setRequestModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-brandTeal-600 font-bold hover:underline"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Request &ldquo;{searchTerm || 'My College'}&rdquo; to be added
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <Link
              href="/colleges?flow=register"
              onClick={() => setModalOpen(false)}
              className="text-slate-500 hover:text-brandTeal-600 font-medium"
            >
              Open Full College Finder Page &rarr;
            </Link>

            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setRequestModalOpen(true);
              }}
              className="text-brandTeal-600 hover:underline font-bold"
            >
              Can&apos;t find your college?
            </button>
          </div>
        </div>
      </Modal>

      {/* Request College Modal */}
      <RequestCollegeModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        prefillName={searchTerm}
      />
    </div>
  );
};
