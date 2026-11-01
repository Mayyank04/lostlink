import React from 'react';
import { ItemStatus, ReportType } from '@/types/report';
import { STATUS_CONFIG, cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ItemStatus;
  type?: ReportType;
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type,
  showDot = true,
  className,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;

  // If type is explicitly passed with 'active' status, highlight Lost vs Found
  let label = config.label;
  let bg = config.bg;
  let text = config.text;
  let border = config.border;
  let dot = config.dot;

  if (status === 'active' && type) {
    if (type === 'lost') {
      label = 'Lost Item';
      bg = 'bg-rose-50 dark:bg-rose-950/40';
      text = 'text-rose-700 dark:text-rose-400';
      border = 'border-rose-200 dark:border-rose-800';
      dot = 'bg-rose-500';
    } else {
      label = 'Found Item';
      bg = 'bg-teal-50 dark:bg-teal-950/40';
      text = 'text-teal-700 dark:text-teal-400';
      border = 'border-teal-200 dark:border-teal-800';
      dot = 'bg-teal-500';
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors select-none',
        bg,
        text,
        border,
        className
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />}
      {label}
    </span>
  );
};

