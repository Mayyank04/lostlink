import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
        primary: 'bg-brandTeal-50 text-brandTeal-700 dark:bg-brandTeal-950 dark:text-brandTeal-300 border border-brandTeal-200 dark:border-brandTeal-800',
        secondary: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        outline: 'border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300',
        success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
        warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
        destructive: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
};

