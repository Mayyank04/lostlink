'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CollegeCard, CollegeSearchResult } from '@/components/colleges/CollegeCard';
import { CollegeFilters } from '@/components/colleges/CollegeFilters';
import { RequestCollegeModal } from '@/components/colleges/RequestCollegeModal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  Search,
  X,
  School,
  MapPin,
  Sparkles,
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  HelpCircle,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import Link from 'next/link';

function CollegesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { switchCollege, activeCollege } = useAuth();
  const { success } = useToast();

  const flowParam = searchParams.get('flow');
  const selectParam = searchParams.get('select');
  const flow = flowParam === 'register' || selectParam === 'true' ? 'register' : 'browse';
  const initialQ = searchParams.get('q') || '';
  const initialCountry = searchParams.get('country') || '';
  const initialState = searchParams.get('state') || '';
  const initialCity = searchParams.get('city') || '';
  const initialSort = searchParams.get('sort') || 'name_asc';
  const initialPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [country, setCountry] = useState(initialCountry);
  const [state, setState] = useState(initialState);
  const [city, setCity] = useState(initialCity);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

  // Results & Loading State
  const [colleges, setColleges] = useState<CollegeSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Hierarchical Location Dropdown Data
  const [countriesList, setCountriesList] = useState<string[]>([]);
  const [statesList, setStatesList] = useState<string[]>([]);
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Modals
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [confirmModalCollege, setConfirmModalCollege] = useState<CollegeSearchResult | null>(null);

  // Stale request race protection
  const latestRequestIdRef = useRef(0);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchTerm);
      setPage(1); // reset to page 1 on keyword change
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load Location Hierarchies
  const loadLocations = useCallback(async (selectedCountry?: string, selectedState?: string) => {
    setIsLoadingLocations(true);
    try {
      const params = new URLSearchParams();
      if (selectedCountry) params.set('country', selectedCountry);
      if (selectedState) params.set('state', selectedState);

      const res = await fetch(`/api/colleges/locations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCountriesList(data.countries || []);
          setStatesList(data.states || []);
          setCitiesList(data.cities || []);
        }
      }
    } catch (e) {
      console.warn('Could not load locations:', e);
    } finally {
      setIsLoadingLocations(false);
    }
  }, []);

  // Initial location load
  useEffect(() => {
    loadLocations(country, state);
  }, []);

  // Fetch search results with race-condition protection
  const fetchColleges = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
      if (country) params.set('country', country);
      if (state) params.set('state', state);
      if (city) params.set('city', city);
      params.set('sort', sort);
      params.set('page', page.toString());
      params.set('limit', '12');

      // Update URL query string without reloading
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(params);
        if (flow === 'register') urlParams.set('flow', 'register');
        window.history.replaceState(null, '', `?${urlParams.toString()}`);
      }

      const res = await fetch(`/api/colleges/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Ignore if a newer request has started
        if (requestId === latestRequestIdRef.current) {
          setColleges(data.colleges || []);
          setTotalCount(data.pagination?.total || 0);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      }
    } catch (e) {
      console.error('Search request failed:', e);
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedQ, country, state, city, sort, page, flow]);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);

  // Hierarchical Filter Change Handlers
  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    setState(''); // Clear dependent state
    setCity(''); // Clear dependent city
    setPage(1);
    loadLocations(newCountry, '');
  };

  const handleStateChange = (newState: string) => {
    setState(newState);
    setCity(''); // Clear dependent city
    setPage(1);
    loadLocations(country, newState);
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedQ('');
    setCountry('');
    setState('');
    setCity('');
    setSort('name_asc');
    setPage(1);
    loadLocations('', '');
  };

  // College Selection Handler
  const handleSelectCollege = (col: CollegeSearchResult) => {
    if (flow === 'register') {
      // Continue directly to registration with preselected institution
      router.push(`/auth/register?college=${col.id}`);
    } else {
      // Open selection confirmation modal
      setConfirmModalCollege(col);
    }
  };

  const handleConfirmSwitch = (col: CollegeSearchResult) => {
    switchCollege(col.id);
    success('College Selected', `Active campus scope switched to ${col.name}.`);
    setConfirmModalCollege(null);
    router.push('/discover');
  };

  const activeFiltersCount = [country, state, city].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Top Header Banner */}
        <div className="text-center space-y-2 py-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brandTeal-100 dark:bg-brandTeal-950 text-brandTeal-800 dark:text-brandTeal-300 border border-brandTeal-300 dark:border-brandTeal-800 shadow-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Global University Federation
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Find Your College
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Search thousands of institutions and connect with your campus community.
          </p>
        </div>

        {/* Registration Flow Banner */}
        {flow === 'register' && (
          <div className="rounded-2xl bg-gradient-to-r from-brandTeal-600 to-blue-600 p-4 text-white shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold">
                <School className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-100">Student Registration Step 1</p>
                <p className="text-sm font-semibold">Select your enrolled college to continue account registration</p>
              </div>
            </div>
            <Link
              href="/auth/register"
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white text-teal-900 hover:bg-teal-50 transition-colors shrink-0"
            >
              Back to Form
            </Link>
          </div>
        )}

        {/* Search Bar & Mobile Filter Trigger */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-card flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by college name, abbreviation (e.g. 'IILM', 'MIT', 'Sharda'), or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brandTeal-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`sm:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold ${
                activeFiltersCount > 0
                  ? 'border-brandTeal-500 bg-brandTeal-50 dark:bg-brandTeal-950 text-brandTeal-700 dark:text-brandTeal-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
            </button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setRequestModalOpen(true)}
              className="text-xs shrink-0 whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              Request College
            </Button>
          </div>
        </div>

        {/* Hierarchical Location Filters */}
        <div className={`${showMobileFilters ? 'block' : 'hidden'} sm:block`}>
          <CollegeFilters
            country={country}
            state={state}
            city={city}
            sort={sort}
            countries={countriesList}
            states={statesList}
            cities={citiesList}
            onCountryChange={handleCountryChange}
            onStateChange={handleStateChange}
            onCityChange={handleCityChange}
            onSortChange={(s) => {
              setSort(s);
              setPage(1);
            }}
            onReset={handleResetFilters}
            isLoadingLocations={isLoadingLocations}
          />
        </div>

        {/* Active Filter Pills Bar */}
        {(debouncedQ || country || state || city) && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold">
              Active Filters:
            </span>
            {debouncedQ && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                Keyword: &ldquo;{debouncedQ}&rdquo;
                <button onClick={() => setSearchTerm('')} className="hover:text-rose-500 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {country && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brandTeal-100 dark:bg-brandTeal-950 text-brandTeal-800 dark:text-brandTeal-300">
                Country: {country}
                <button onClick={() => handleCountryChange('')} className="hover:text-rose-500 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {state && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                State: {state}
                <button onClick={() => handleStateChange('')} className="hover:text-rose-500 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {city && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                City: {city}
                <button onClick={() => handleCityChange('')} className="hover:text-rose-500 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Results Count & Meta */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            {isLoading ? (
              'Searching institutions...'
            ) : (
              <>
                Showing <strong>{colleges.length}</strong> of <strong>{totalCount}</strong> institutions
              </>
            )}
          </span>
          {activeCollege && (
            <span className="hidden md:inline font-mono text-[11px]">
              Current active scope: <strong>{activeCollege.name}</strong>
            </span>
          )}
        </div>

        {/* College Grid / List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-10 bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
              </div>
            ))}
          </div>
        ) : colleges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {colleges.map((col) => (
              <CollegeCard
                key={col.id}
                college={col}
                isSelected={col.id === activeCollege?.id}
                onSelect={handleSelectCollege}
                actionLabel={flow === 'register' ? 'Select for Signup' : 'Select College'}
              />
            ))}
          </div>
        ) : (
          /* Empty Search State */
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <School className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No matching institutions found
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find an institution matching &ldquo;<strong>{debouncedQ || country || state}</strong>&rdquo;. Check your spelling, try removing location filters, or submit a request to add your campus.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
              <Button size="sm" variant="primary" onClick={() => setRequestModalOpen(true)}>
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Request &ldquo;{searchTerm || 'My College'}&rdquo;
              </Button>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            <span className="text-slate-500 font-medium">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>

            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* "Can't find your college?" Section */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-brandTeal-400" />
              <h3 className="font-bold text-sm">Can&apos;t find your college?</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              LostLink connects colleges across the globe. If your university is not yet federated, submit an onboarding request and our administrators will review and provision your campus.
            </p>
          </div>
          <Button
            size="md"
            variant="primary"
            onClick={() => setRequestModalOpen(true)}
            className="text-xs font-bold shrink-0 bg-brandTeal-500 hover:bg-brandTeal-600 text-white"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Request My College
          </Button>
        </div>
      </div>

      {/* Confirmation Modal for Browsing Users */}
      {confirmModalCollege && (
        <Modal
          isOpen={Boolean(confirmModalCollege)}
          onClose={() => setConfirmModalCollege(null)}
          title={`Connect with ${confirmModalCollege.name}`}
          description="Choose how you want to participate in this college community."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-xs"
                style={{ backgroundColor: confirmModalCollege.primaryColor || '#0F766E' }}
              >
                {(confirmModalCollege.shortName || confirmModalCollege.name).charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {confirmModalCollege.name}
                </p>
                <p className="text-slate-500 text-xs">
                  {confirmModalCollege.city}, {confirmModalCollege.state} • {confirmModalCollege.country}
                </p>
                {confirmModalCollege.emailDomains?.[0] && (
                  <p className="text-brandTeal-600 font-mono text-[10px] mt-0.5">
                    Approved domain: @{confirmModalCollege.emailDomains[0]}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <Link
                href={`/auth/register?college=${confirmModalCollege.id}`}
                className="w-full"
              >
                <Button size="md" variant="primary" className="w-full text-xs font-bold">
                  Register as Student
                </Button>
              </Link>
              <Button
                size="md"
                variant="outline"
                onClick={() => handleConfirmSwitch(confirmModalCollege)}
                className="w-full text-xs font-bold"
              >
                Switch Active View
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Request College Modal */}
      <RequestCollegeModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        prefillName={searchTerm}
      />
    </div>
  );
}

export default function CollegesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-slate-400">
          Loading College Directory...
        </div>
      }
    >
      <CollegesPageContent />
    </Suspense>
  );
}

