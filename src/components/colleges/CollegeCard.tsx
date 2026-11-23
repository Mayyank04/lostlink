'use client';

import React from 'react';
import { School, MapPin, Building2, CheckCircle2, Users, Package, ArrowRight, Check, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface CollegeSearchResult {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  logoUrl: string | null;
  city: string;
  state: string;
  country: string;
  primaryColor: string;
  institutionType: string;
  website?: string | null;
  domain?: string;
  emailDomains: string[];
  isVerified: boolean;
  domainVerificationStatus?: string;
  campuses?: Array<{
    id: string;
    name: string;
    code: string;
    addressLabel?: string;
  }>;
  stats?: {
    activeItems: number;
    activeMembers: number;
  };
}

interface CollegeCardProps {
  college: CollegeSearchResult;
  isSelected?: boolean;
  onSelect?: (college: CollegeSearchResult) => void;
  actionLabel?: string;
}

export const CollegeCard: React.FC<CollegeCardProps> = ({
  college,
  isSelected = false,
  onSelect,
  actionLabel = 'Select College',
}) => {
  const campusCount = college.campuses?.length || 1;
  const initial = (college.shortName || college.name || 'C').charAt(0).toUpperCase();

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between h-full bg-white dark:bg-slate-900 ${
        isSelected
          ? 'border-brandTeal-600 dark:border-brandTeal-500 ring-2 ring-brandTeal-500/20 shadow-md'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-card'
      }`}
    >
      <div className="space-y-3">
        {/* Top Header: Logo / Avatar + Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-xs overflow-hidden"
              style={{ backgroundColor: college.primaryColor || '#0F766E' }}
            >
              {college.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={college.logoUrl}
                  alt={college.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                initial
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
                  {college.name}
                </h3>
                {college.shortName && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {college.shortName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {college.city}, {college.state} • {college.country}
                </span>
              </p>
            </div>
          </div>

          {college.isVerified ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 shrink-0"
              title="Verified Institutional Partner"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Verified Partner</span>
            </span>
          ) : college.domainVerificationStatus === 'REJECTED' ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 shrink-0"
              title="Domain Verification Rejected"
            >
              <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>Registration Unavailable</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 shrink-0"
              title="Domain Verification Pending Review"
            >
              <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Verification Pending</span>
            </span>
          )}
        </div>

        {/* Campuses & Domains Info */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            {campusCount} {campusCount === 1 ? 'Campus' : 'Campuses'}
          </span>

          {college.emailDomains && college.emailDomains.length > 0 && (
            <span className="font-mono text-[10px] text-brandTeal-600 dark:text-brandTeal-400 truncate max-w-[150px]">
              @{college.emailDomains[0]}
            </span>
          )}
        </div>

        {/* Community & Lost/Found Telemetry */}
        {college.stats && (
          <div className="flex items-center gap-3 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Package className="w-3.5 h-3.5 text-brandTeal-600" />
              <strong>{college.stats.activeItems}</strong> active items
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <strong>{college.stats.activeMembers}</strong> students
            </span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
          {college.institutionType || 'University'}
        </span>

        {onSelect && (
          <Button
            size="sm"
            variant={isSelected ? 'primary' : 'outline'}
            onClick={() => onSelect(college)}
            className="text-xs font-bold"
          >
            {isSelected ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" />
                Selected
              </>
            ) : (
              <>
                {actionLabel}
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

