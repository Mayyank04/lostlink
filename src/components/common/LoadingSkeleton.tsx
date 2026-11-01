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

