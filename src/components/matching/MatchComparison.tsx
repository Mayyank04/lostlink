'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MatchResult } from '@/types/match';
import { MatchScore } from '@/components/matching/MatchScore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Building,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface MatchComparisonProps {
  match: MatchResult;
  onDismiss?: (matchId: string) => void;
  onStartClaim?: (match: MatchResult) => void;
  compact?: boolean;
}

export const MatchComparison: React.FC<MatchComparisonProps> = ({
  match,
  onDismiss,
  onStartClaim,
  compact = false,
}) => {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const { lostReport, foundReport, breakdown, totalScore, confidenceTier } = match;

  const scoreRows = [
    { key: 'category', label: 'Category', attr: breakdown.category },
    { key: 'nameSimilarity', label: 'Name & Keywords', attr: breakdown.nameSimilarity },
    { key: 'color', label: 'Color Alignment', attr: breakdown.color },
    { key: 'brand', label: 'Brand Match', attr: breakdown.brand },
    { key: 'location', label: 'Campus Facility', attr: breakdown.location },
    { key: 'timePlausibility', label: 'Timeline Plausibility', attr: breakdown.timePlausibility },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-subtle p-5 space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <MatchScore
          score={totalScore}
          confidenceTier={confidenceTier}
          showExplanationHint={true}
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDetailsModalOpen(true)}
            className="text-xs text-slate-600 dark:text-slate-400"
          >
            <HelpCircle className="w-3.5 h-3.5 mr-1 text-brandTeal-600" />
            Explain Score
          </Button>
          {onDismiss && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDismiss(match.id)}
              className="text-xs text-slate-500 hover:text-red-600"
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lost Report Column */}
        <div className="rounded-xl border border-rose-100 dark:border-rose-950/60 bg-rose-50/30 dark:bg-rose-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Reported Lost
            </span>
            <span className="font-mono text-[10px] text-slate-400">{lostReport.referenceNumber}</span>
          </div>

          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden">
              {lostReport.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lostReport.images[0]} alt={lostReport.title} className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                {lostReport.title}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                {lostReport.publicDescription}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-rose-100 dark:border-rose-950/60 text-xs space-y-1 text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Location:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{lostReport.locationBuilding}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Date Lost:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(lostReport.dateOccurred)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Color / Brand:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{lostReport.color} • {lostReport.brand || 'Unspecified'}</span>
            </div>
          </div>
        </div>

        {/* Found Report Column */}
        <div className="rounded-xl border border-teal-100 dark:border-teal-950/60 bg-teal-50/30 dark:bg-teal-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Reported Found
            </span>
            <span className="font-mono text-[10px] text-slate-400">{foundReport.referenceNumber}</span>
          </div>

          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden">
              {foundReport.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foundReport.images[0]} alt={foundReport.title} className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                {foundReport.title}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                {foundReport.publicDescription}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-teal-100 dark:border-teal-950/60 text-xs space-y-1 text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Location:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{foundReport.locationBuilding}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Date Found:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(foundReport.dateOccurred)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Color / Brand:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{foundReport.color} • {foundReport.brand || 'Unspecified'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Matching Attributes Pill summary */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="text-slate-400 text-[11px] font-semibold">Matched Dimensions:</span>
        {scoreRows.map((r) => (
          <span
            key={r.key}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
              r.attr.matched
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
          >
            {r.attr.matched ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ) : (
              <XCircle className="w-3 h-3 text-slate-400" />
            )}
            {r.label} ({r.attr.score}/{r.attr.maxScore})
          </span>
        ))}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link
            href={`/items/${foundReport.id}`}
            className="text-brandTeal-700 dark:text-brandTeal-400 hover:underline font-semibold flex items-center gap-1"
          >
            Inspect Found Listing <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/claims?initiateFoundId=${foundReport.id}&lostId=${lostReport.id}`}>
            <Button size="sm" variant="primary" className="text-xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Claim This Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Score Explanation Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Rule-Based Match Score Breakdown"
        description="Explainable deterministic algorithm scoring (100-point model)"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Score Calculation</p>
              <h4 className="text-xl font-black text-slate-900 dark:text-white">{totalScore} / 100 Points</h4>
            </div>
            <MatchScore score={totalScore} confidenceTier={confidenceTier} size="sm" />
          </div>

          <div className="space-y-2">
            {scoreRows.map((row) => (
              <div
                key={row.key}
                className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    {row.attr.matched ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{row.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-5">
                    {row.attr.explanation}
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">
                  {row.attr.score} / {row.attr.maxScore}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
            <strong>Important Safety Notice:</strong> Match scores evaluate similarity indicators and do not guarantee ownership. All items require verified ownership answers or in-person custody demonstration before property handover.
          </div>
        </div>
      </Modal>
    </div>
  );
};

