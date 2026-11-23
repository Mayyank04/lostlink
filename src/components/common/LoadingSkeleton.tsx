import React from 'react';
import { cn } from '@/lib/utils';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-800', className)}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900">
      <Skeleton className="h-44 w-full rounded-lg" />
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="pt-2 flex justify-between items-center">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
};

export const ItemCardSkeleton: React.FC<{ layout?: 'grid' | 'list' }> = ({ layout = 'grid' }) => {
  if (layout === 'list') {
    return (
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Skeleton className="w-full sm:w-44 h-36 shrink-0 rounded-lg" />
        <div className="flex-1 flex flex-col justify-between space-y-2">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="pt-2 flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>
    );
  }

  return <CardSkeleton />;
};

export const TableRowSkeleton: React.FC<{ columns?: number; rows?: number }> = ({
  columns = 5,
  rows = 4,
}) => {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
      {/* Header Skeleton */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4">
        {Array.from({ length: columns }).map((_, idx) => (
          <Skeleton key={`head-${idx}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={`row-${rIdx}`} className="p-4 flex items-center gap-4">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <Skeleton
              key={`cell-${rIdx}-${cIdx}`}
              className={cn('h-4', cIdx === 0 ? 'flex-1 font-bold' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const DashboardStatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={`stat-${idx}`}
          className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 space-y-3"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
};

export const ClaimDetailSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
};

export const MatchResultSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-10 w-16 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={`factor-${idx}`} className="h-8 w-full rounded-lg" />
        ))}
      </div>
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
    </div>
  );
};
