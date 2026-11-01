export interface CategoryStat {
  category: string;
  lostCount: number;
  foundCount: number;
  returnedCount: number;
}

export interface MonthlyTrend {
  month: string;
  reported: number;
  matched: number;
  returned: number;
}

export interface CampusActivityStat {
  campusName: string;
  activeReports: number;
  resolvedReports: number;
  recoveryRatePercent: number;
}

export interface CollegeAdminAnalytics {
  collegeId: string;
  totalLostReports: number;
  totalFoundReports: number;
  activeMatchesCount: number;
  pendingClaimsCount: number;
  successfulReturnsCount: number;
  averageResolutionDays: number;
  recoveryRatePercent: number;
  categoryStats: CategoryStat[];
  monthlyTrends: MonthlyTrend[];
  campusStats: CampusActivityStat[];
}

export interface PlatformAdminAnalytics {
  totalCollegesCount: number;
  totalStudentsCount: number;
  totalPlatformReports: number;
  totalPlatformReturns: number;
  averagePlatformRecoveryRate: number;
  systemHealth: {
    status: 'healthy' | 'degraded' | 'maintenance';
    uptimePercent: number;
    apiLatencyMs: number;
    databasePoolStatus: string;
    k8sPodsHealthy: number;
    k8sPodsTotal: number;
  };
  collegeComparison: {
    collegeName: string;
    students: number;
    reports: number;
    recoveryRate: number;
    status: 'active' | 'pending_verification' | 'suspended';
  }[];
}

