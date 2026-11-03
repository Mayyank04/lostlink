'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { MatchResult } from '@/types/match';
import { MatchingService } from '@/lib/services/api';
import { MatchComparison } from '@/components/matching/MatchComparison';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { Sparkles, ShieldCheck, Filter, RefreshCw, Info } from 'lucide-react';

export default function MatchesPage() {
  const { activeCollege } = useAuth();
  const { info, success } = useToast();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [filterConfidence, setFilterConfidence] = useState<'all' | 'high' | 'medium'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const results = await MatchingService.getAllMatches(activeCollege.id);
      setMatches(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setIsLoading(true);
    try {
      await fetch(`/api/matches/recalculate?collegeId=${activeCollege.id}`, { method: 'POST' });
      success('Radar Refreshed', 'Candidate pairs re-evaluated against latest active reports.');
      await fetchMatches();
    } catch {
      await fetchMatches();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [activeCollege.id]);

  const handleDismiss = async (matchId: string) => {
    setDismissedIds((prev) => new Set([...Array.from(prev), matchId]));
    info('Match Dismissed', 'This pair has been hidden from your active radar view.');
    try {
      await fetch(`/api/matches/${matchId}/dismiss`, { method: 'POST' });
    } catch (e) {
      console.warn('Failed to persist dismissal:', e);
    }
  };

  const activeMatches = matches.filter(
    (m) =>
      !dismissedIds.has(m.id) &&
      (filterConfidence === 'all' || m.confidenceTier === filterConfidence)
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Automated Match Radar
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Deterministic 100-Pt Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Explainable pairings between lost reports and found belongings across {activeCollege.shortName || activeCollege.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Confidence filter */}
          <select
            value={filterConfidence}
            onChange={(e) => setFilterConfidence(e.target.value as any)}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Confidence Levels</option>
            <option value="high">High Match Only (75%+)</option>
            <option value="medium">Medium Alignment (50-74%)</option>
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRecalculate}
            className="text-xs"
            title="Recalculate Radar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Algorithmic Explainability Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs flex items-start gap-3 shadow-card">
        <Sparkles className="w-5 h-5 text-brandTeal-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white text-xs">
            How Match Radar Computes Potential Links
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Weights: Category (25 pts), Title & Keyword Overlap (25 pts), Color (15 pts), Brand (10 pts), Campus Facility Proximity (15 pts), and Timeline Plausibility (10 pts). Match scores indicate similarity — full zero-knowledge proof or physical unlock is required prior to handover.
          </p>
        </div>
      </div>

      {/* Matches List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : activeMatches.length > 0 ? (
        <div className="space-y-6">
          {activeMatches.map((match) => (
            <MatchComparison
              key={match.id}
              match={match}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Active Matches on Radar"
          description={
            filterConfidence !== 'all'
              ? 'No matches meet this strict confidence filter. Try switching to "All Confidence Levels".'
              : 'Our matching algorithm checks new reports automatically. Report a lost or found item to activate pairing.'
          }
          actionLabel="Report Lost Item"
          onAction={() => (window.location.href = '/report/lost')}
          secondaryActionLabel="Browse Directory"
          onSecondaryAction={() => (window.location.href = '/discover')}
        />
      )}
    </div>
  );
}

