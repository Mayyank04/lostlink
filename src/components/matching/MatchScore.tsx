import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';

interface MatchScoreProps {
  score: number;
  confidenceTier: 'high' | 'medium' | 'low';
  size?: 'sm' | 'md' | 'lg';
  showExplanationHint?: boolean;
}

export const MatchScore: React.FC<MatchScoreProps> = ({
  score,
  confidenceTier,
  size = 'md',
  showExplanationHint = false,
}) => {
  const tierConfig = {
    high: {
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800',
      ringColor: 'stroke-emerald-600',
      label: 'High Match Probability',
      icon: Sparkles,
    },
    medium: {
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800',
      ringColor: 'stroke-amber-600',
      label: 'Moderate Alignment',
      icon: ShieldCheck,
    },
    low: {
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800',
      border: 'border-slate-200 dark:border-slate-700',
      ringColor: 'stroke-slate-400',
      label: 'Low Match Alignment',
      icon: AlertCircle,
    },
  }[confidenceTier];

  const Icon = tierConfig.icon;

  if (size === 'sm') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border',
          tierConfig.bg,
          tierConfig.color,
          tierConfig.border
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{score}% Match</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Circular score gauge */}
      <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-slate-200 dark:text-slate-700 stroke-current"
            strokeWidth="3.5"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={cn('stroke-current transition-all duration-700', tierConfig.color)}
            strokeDasharray={`${score}, 100`}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <span className="absolute font-black text-sm text-slate-900 dark:text-white">
          {score}%
        </span>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <Icon className={cn('w-4 h-4', tierConfig.color)} />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {tierConfig.label}
          </h4>
        </div>
        {showExplanationHint && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Rule-based similarity score. Not legal proof of ownership.
          </p>
        )}
      </div>
    </div>
  );
};

