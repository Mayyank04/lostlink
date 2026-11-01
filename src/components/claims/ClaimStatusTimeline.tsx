import React from 'react';
import { ClaimTimelineEvent, ClaimStatus } from '@/types/claim';
import { formatDateTime } from '@/lib/utils';
import { CheckCircle2, Clock, ShieldCheck, XCircle, UserCheck } from 'lucide-react';

interface ClaimStatusTimelineProps {
  timeline: ClaimTimelineEvent[];
  currentStatus: ClaimStatus;
}

export const ClaimStatusTimeline: React.FC<ClaimStatusTimelineProps> = ({
  timeline,
  currentStatus,
}) => {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Verification & Custody Audit Trail
      </h4>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {timeline.map((event, idx) => {
          const isLatest = idx === timeline.length - 1;
          return (
            <div key={event.id} className="relative group">
              <span
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 ${
                  isLatest
                    ? 'bg-brandTeal-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
              </span>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {event.action}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {formatDateTime(event.timestamp)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {event.actorName}
                  </span>
                  <span>•</span>
                  <span className="capitalize text-slate-400">
                    {event.actorRole.replace('_', ' ')}
                  </span>
                </div>

                {event.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-1.5 leading-relaxed">
                    {event.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

