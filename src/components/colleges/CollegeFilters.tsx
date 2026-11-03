'use client';

import React from 'react';
import { Globe, MapPin, Building, RotateCcw, ArrowUpDown } from 'lucide-react';

interface CollegeFiltersProps {
  country: string;
  state: string;
  city: string;
  sort: string;
  countries: string[];
  states: string[];
  cities: string[];
  onCountryChange: (val: string) => void;
  onStateChange: (val: string) => void;
  onCityChange: (val: string) => void;
  onSortChange: (val: string) => void;
  onReset: () => void;
  isLoadingLocations?: boolean;
}

export const CollegeFilters: React.FC<CollegeFiltersProps> = ({
  country,
  state,
  city,
  sort,
  countries,
  states,
  cities,
  onCountryChange,
  onStateChange,
  onCityChange,
  onSortChange,
  onReset,
  isLoadingLocations = false,
}) => {
  const hasActiveFilters = Boolean(country || state || city || (sort && sort !== 'name_asc'));

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-brandTeal-600 dark:text-brandTeal-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Hierarchical Location Filters
          </h4>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Country Selector */}
        <div>
          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 flex items-center gap-1">
            <Globe className="w-3 h-3 text-slate-400" />
            Country
          </label>
          <select
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            disabled={isLoadingLocations}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brandTeal-500 disabled:opacity-60 transition-all text-xs"
          >
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* State / Region Selector */}
        <div>
          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            State / Region
          </label>
          <select
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            disabled={isLoadingLocations || (states.length === 0 && Boolean(country))}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brandTeal-500 disabled:opacity-60 transition-all text-xs"
          >
            <option value="">All States / Regions</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* City Selector */}
        <div>
          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 flex items-center gap-1">
            <Building className="w-3 h-3 text-slate-400" />
            City
          </label>
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            disabled={isLoadingLocations || (cities.length === 0 && Boolean(state))}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brandTeal-500 disabled:opacity-60 transition-all text-xs"
          >
            <option value="">All Cities</option>
            {cities.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            Sort By
          </label>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brandTeal-500 transition-all text-xs"
          >
            <option value="name_asc">Alphabetical (A - Z)</option>
            <option value="name_desc">Alphabetical (Z - A)</option>
            <option value="popular">Community Size (Most Active)</option>
            <option value="newest">Recently Added</option>
          </select>
        </div>
      </div>
    </div>
  );
};
