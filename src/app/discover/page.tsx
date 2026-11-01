'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ItemReport, ItemCategory, ReportType, ItemStatus } from '@/types/report';
import { ReportService } from '@/lib/services/api';
import { ItemCard } from '@/components/items/ItemCard';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/Button';
import { CATEGORY_LABELS } from '@/lib/utils';
import {
  Search,
  Filter,
  Grid,
  List,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Building,
  ShieldCheck,
} from 'lucide-react';

function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeCollege, allColleges } = useAuth();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [reportType, setReportType] = useState<'all' | ReportType>(
    (searchParams.get('type') as 'all' | ReportType) || 'all'
  );
  const [collegeId, setCollegeId] = useState<string>(activeCollege.id);
  const [campusId, setCampusId] = useState<string>('all');
  const [category, setCategory] = useState<'all' | ItemCategory>(
    (searchParams.get('category') as 'all' | ItemCategory) || 'all'
  );
  const [status, setStatus] = useState<'all' | ItemStatus>('all');
  const [color, setColor] = useState('');
  const [officeOnly, setOfficeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'date_occurred'>('newest');

  // UI state
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Data state
  const [items, setItems] = useState<ItemReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync college when active college in context changes
  useEffect(() => {
    setCollegeId(activeCollege.id);
  }, [activeCollege.id]);

  useEffect(() => {
    setIsLoading(true);
    ReportService.getReports({
      searchQuery,
      type: reportType,
      collegeId: collegeId === 'all' ? undefined : collegeId,
      campusId: campusId === 'all' ? undefined : campusId,
      category: category === 'all' ? undefined : category,
      status: status === 'all' ? undefined : status,
      color: color || undefined,
      depositedAtOfficeOnly: officeOnly || undefined,
      sortBy,
    }).then((res) => {
      setItems(res);
      setIsLoading(false);
      setCurrentPage(1);
    });
  }, [searchQuery, reportType, collegeId, campusId, category, status, color, officeOnly, sortBy]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setReportType('all');
    setCategory('all');
    setStatus('all');
    setColor('');
    setCampusId('all');
    setOfficeOnly(false);
    setSortBy('newest');
  };

  const selectedCollege = allColleges.find((c) => c.id === collegeId);
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasActiveFilters =
    searchQuery ||
    reportType !== 'all' ||
    category !== 'all' ||
    status !== 'all' ||
    color ||
    campusId !== 'all' ||
    officeOnly;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Campus Item Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Discover active lost & found listings across registered university grounds
          </p>
        </div>

        {/* Search input */}
        <div className="w-full md:w-96 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search keywords, items, buildings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brandTeal-600 transition-all"
          />
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-subtle space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Type Selector Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              onClick={() => setReportType('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                reportType === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Items ({items.length})
            </button>
            <button
              onClick={() => setReportType('lost')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                reportType === 'lost'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
              }`}
            >
              Lost Only
            </button>
            <button
              onClick={() => setReportType('found')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                reportType === 'found'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-teal-700'
              }`}
            >
              Found Only
            </button>
          </div>

          {/* Right Controls: Sort & Layout */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                hasActiveFilters
                  ? 'bg-brandTeal-50 border-brandTeal-300 text-brandTeal-800 dark:bg-brandTeal-950 dark:border-brandTeal-800 dark:text-brandTeal-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {hasActiveFilters && '(Active)'}</span>
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="date_occurred">Date Lost/Found</option>
            </select>

            <div className="hidden sm:flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
              <button
                onClick={() => setLayout('grid')}
                className={`p-1.5 rounded-md ${
                  layout === 'grid'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                aria-label="Grid layout"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setLayout('list')}
                className={`p-1.5 rounded-md ${
                  layout === 'list'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                aria-label="List layout"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Advanced Filters Drawer */}
        {isFilterOpen && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Institution
              </label>
              <select
                value={collegeId}
                onChange={(e) => {
                  setCollegeId(e.target.value);
                  setCampusId('all');
                }}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
              >
                <option value="all">All Institutions</option>
                {allColleges.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Campus / Branch
              </label>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                disabled={collegeId === 'all'}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs disabled:opacity-50"
              >
                <option value="all">All Campuses</option>
                {selectedCollege?.campuses.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
              >
                <option value="all">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Listing Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Listing</option>
                <option value="matched">Potential Match Found</option>
                <option value="pending_claim">Claim In Progress</option>
                <option value="returned">Successfully Returned</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={officeOnly}
                  onChange={(e) => setOfficeOnly(e.target.checked)}
                  className="rounded border-slate-300 text-brandTeal-600 focus:ring-brandTeal-600"
                />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Deposited at Campus Lost & Found Desk Only
                </span>
              </label>
            </div>

            <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-1">
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={handleClearFilters} className="text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Item Listings Grid / List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : paginatedItems.length > 0 ? (
        <div
          className={
            layout === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {paginatedItems.map((item) => (
            <ItemCard key={item.id} item={item} layout={layout} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Matching Belongings Found"
          description="Try broadening your search query, checking neighboring campus branches, or resetting your filters."
          actionLabel="Clear All Filters"
          onAction={handleClearFilters}
          secondaryActionLabel="Report This Item"
          onSecondaryAction={() => router.push('/report/lost')}
        />
      )}

      {/* Pagination */}
      {!isLoading && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          totalItems={items.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading catalog directory...</div>}>
      <DiscoverContent />
    </Suspense>
  );
}
