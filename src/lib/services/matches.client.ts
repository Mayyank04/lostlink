import { MatchResult } from '@/types/match';
import { calculateMatchScore } from '@/lib/matching/engine';
import { ReportService, mapDbItemToReport } from './items.client';

/**
 * Matching Service: Rule-based matching engine
 */
export const MatchingService = {
  async findMatchesForReport(reportId: string): Promise<MatchResult[]> {
    const targetReport = await ReportService.getReportById(reportId);
    if (!targetReport) return [];

    const allReports = await ReportService.getReports({});
    const oppositeType = targetReport.type === 'lost' ? 'found' : 'lost';
    const candidates = allReports.filter(
      (r) => r.type === oppositeType && r.status !== 'closed' && r.status !== 'returned'
    );

    const matches: MatchResult[] = [];
    for (const cand of candidates) {
      const match = calculateMatchScore(targetReport, cand);
      if (match && match.totalScore >= 35) {
        matches.push(match);
      }
    }

    return matches.sort((a, b) => b.totalScore - a.totalScore);
  },

  async getAllMatches(collegeId?: string): Promise<MatchResult[]> {
    try {
      const params = collegeId && collegeId !== 'all' ? `?collegeId=${collegeId}` : '';
      const res = await fetch(`/api/matches${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.matches && Array.isArray(data.matches)) {
          return data.matches.map((m: any) => ({
            id: m.id,
            lostReportId: m.lostItem.id,
            foundReportId: m.foundItem.id,
            lostReport: mapDbItemToReport(m.lostItem),
            foundReport: mapDbItemToReport(m.foundItem),
            totalScore: m.score,
            confidenceTier: m.confidence,
            breakdown: m.breakdown,
            matchingAttributes: m.matchingAttrs || [],
            differingAttributes: m.differingAttrs || [],
            isDismissed: false,
            hasClaimInitiated: false,
            createdAt: m.createdAt,
          }));
        }
      }
    } catch {
      // Fallback
    }

    const allReports = await ReportService.getReports({});
    const lostReports = allReports.filter((r) => r.type === 'lost' && r.status !== 'closed');
    const foundReports = allReports.filter((r) => r.type === 'found' && r.status !== 'closed');

    const results: MatchResult[] = [];
    for (const lost of lostReports) {
      if (collegeId && collegeId !== 'all' && lost.collegeId !== collegeId) continue;
      for (const found of foundReports) {
        if (collegeId && collegeId !== 'all' && found.collegeId !== collegeId) continue;
        const match = calculateMatchScore(lost, found);
        if (match && match.totalScore >= 40) {
          results.push(match);
        }
      }
    }

    return results.sort((a, b) => b.totalScore - a.totalScore);
  },
};
