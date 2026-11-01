import { ItemReport } from './report';

export interface AttributeScore {
  name: string;
  score: number;
  maxScore: number;
  matched: boolean;
  explanation: string;
}

export interface MatchScoreBreakdown {
  category: AttributeScore;
  nameSimilarity: AttributeScore;
  color: AttributeScore;
  brand: AttributeScore;
  location: AttributeScore;
  timePlausibility: AttributeScore;
}

export interface MatchResult {
  id: string;
  lostReportId: string;
  foundReportId: string;
  lostReport: ItemReport;
  foundReport: ItemReport;
  totalScore: number; // 0 to 100
  confidenceTier: 'high' | 'medium' | 'low';
  breakdown: MatchScoreBreakdown;
  matchingAttributes: string[];
  differingAttributes: string[];
  isDismissed: boolean;
  hasClaimInitiated: boolean;
  createdAt: string;
}

