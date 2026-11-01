import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'teal' | 'blue' | 'amber' | 'emerald' | 'navy';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'teal',
  trend,
}) => {
  const variantStyles = {
    teal: {
      bg: 'bg-brandTeal-50/50 dark:bg-brandTeal-950/20',
      iconBg: 'bg-brandTeal-100 dark:bg-brandTeal-900/50 text-brandTeal-700 dark:text-brandTeal-300',
      border: 'border-brandTeal-100 dark:border-brandTeal-900/40',
    },
    blue: {
      bg: 'bg-blue-50/50 dark:bg-blue-950/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
      border: 'border-blue-100 dark:border-blue-900/40',
    },
    amber: {
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
      border: 'border-amber-100 dark:border-amber-900/40',
    },
    emerald: {
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-100 dark:border-emerald-900/40',
    },
    navy: {
      bg: 'bg-slate-50/80 dark:bg-slate-800/40',
      iconBg: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
      border: 'border-slate-200 dark:border-slate-800',
    },
  }[variant];

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 bg-white dark:bg-slate-900 transition-all hover:shadow-card',
        variantStyles.border
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </p>
        <div className={cn('p-2.5 rounded-xl', variantStyles.iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {value}
        </h3>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span
                className={`text-[11px] font-bold ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.value}
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

