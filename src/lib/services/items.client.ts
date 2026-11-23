import { ItemReport, ReportFilterOptions, ItemCategory, ItemStatus } from '@/types/report';
import { getStoredReports, saveReport, deleteReport } from '@/lib/storage/localStore';

const isDemoAllowed = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Maps database item response to frontend ItemReport
 */
export function mapDbItemToReport(item: any): ItemReport {
  return {
    id: item.id,
    referenceNumber: item.reportNumber || `LL-${item.id.slice(0, 8)}`,
    type: (item.type?.toLowerCase() || 'lost') as 'lost' | 'found',
    title: item.title,
    category: (item.category?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'other') as ItemCategory,
    brand: item.brand || undefined,
    color: item.color || 'Unspecified',
    secondaryColor: undefined,
    publicDescription: item.description || item.locationDescription || '',
    collegeId: item.collegeId,
    campusId: item.campusId || '',
    locationBuilding: item.locationDescription || 'Campus',
    locationRoomOrSpecifics: undefined,
    dateOccurred: item.dateIncident ? item.dateIncident.split('T')[0] : new Date().toISOString().split('T')[0],
    timeOccurred: item.timeIncident || undefined,
    images: item.images && item.images.length > 0
      ? item.images
      : item.primaryImage
      ? [item.primaryImage]
      : ['https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&auto=format&fit=crop&q=80'],
    finderDepositedWithOffice: item.depositedWithOffice || false,
    officeLocationNotes: undefined,
    privateEvidence: item.privateEvidence && item.privateEvidence.length > 0
      ? {
          uniqueIdentifiers: item.privateEvidence[0]?.description || undefined,
          serialNumberSnippet: undefined,
          privateNotes: undefined,
          proofOfPurchaseUrl: item.privateEvidence[0]?.fileUrl || undefined,
        }
      : undefined,
    reporterId: item.reporterId || 'user-maya',
    reporterName: item.reporterName || 'Anonymous Student',
    reporterEmail: item.reporterEmail || 'student@university.edu',
    status: (item.status === 'CLAIM_PENDING'
      ? 'pending_claim'
      : item.status?.toLowerCase() || 'active') as ItemStatus,
    moderationStatus: 'approved',
    viewsCount: item.viewsCount || 1,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

/**
 * Report Service: Connects to PostgreSQL backend /api/items with local fallback
 */
export const ReportService = {
  async getReports(options: ReportFilterOptions = {}): Promise<ItemReport[]> {
    try {
      const params = new URLSearchParams();
      if (options.type && options.type !== 'all') params.append('type', options.type.toUpperCase());
      if (options.collegeId && options.collegeId !== 'all') params.append('collegeId', options.collegeId);
      if (options.campusId && options.campusId !== 'all') params.append('campusId', options.campusId);
      if (options.category && options.category !== 'all') params.append('category', options.category);
      if (options.status && options.status !== 'all') {
        const mappedStatus = options.status === 'pending_claim' ? 'CLAIM_PENDING' : options.status.toUpperCase();
        params.append('status', mappedStatus);
      }
      if (options.searchQuery && options.searchQuery.trim().length > 0) {
        params.append('search', options.searchQuery.trim());
      }

      const res = await fetch(`/api/items?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          const mapped = data.items.map(mapDbItemToReport);
          mapped.forEach((rep: ItemReport) => saveReport(rep));
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Backend items API unreachable, falling back to local database store:', e);
    }

    // Fallback to local store
    const all = getStoredReports();
    return all.filter((item) => {
      if (item.moderationStatus === 'removed') return false;
      if (options.type && options.type !== 'all' && item.type !== options.type) return false;
      if (options.collegeId && options.collegeId !== 'all' && item.collegeId !== options.collegeId) return false;
      if (options.campusId && options.campusId !== 'all' && item.campusId !== options.campusId) return false;
      if (options.category && options.category !== 'all' && item.category !== options.category) return false;
      if (options.status && options.status !== 'all' && item.status !== options.status) return false;
      if (options.color && !item.color.toLowerCase().includes(options.color.toLowerCase())) return false;
      if (options.searchQuery && options.searchQuery.trim().length > 0) {
        const q = options.searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.publicDescription.toLowerCase().includes(q);
        const matchesBldg = item.locationBuilding.toLowerCase().includes(q);
        const matchesBrand = item.brand ? item.brand.toLowerCase().includes(q) : false;
        const matchesRef = item.referenceNumber.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesBldg && !matchesBrand && !matchesRef) return false;
      }
      if (options.dateFrom && item.dateOccurred < options.dateFrom) return false;
      if (options.dateTo && item.dateOccurred > options.dateTo) return false;
      if (options.depositedAtOfficeOnly && !item.finderDepositedWithOffice) return false;
      return true;
    }).sort((a, b) => {
      if (options.sortBy === 'oldest') {
        return new Date(a.dateOccurred).getTime() - new Date(b.dateOccurred).getTime();
      }
      if (options.sortBy === 'date_occurred') {
        return new Date(b.dateOccurred).getTime() - new Date(a.dateOccurred).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },

  async getReportById(id: string): Promise<ItemReport | null> {
    try {
      const res = await fetch(`/api/items/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.item) {
          const report = mapDbItemToReport(data.item);
          saveReport(report);
          return report;
        }
      }
    } catch {
      // Fallback
    }

    const all = getStoredReports();
    return all.find((r) => r.id === id) || null;
  },

  async createReport(report: ItemReport): Promise<ItemReport> {
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: report.type.toUpperCase(),
          title: report.title,
          category: report.category,
          brand: report.brand || null,
          color: report.color,
          description: report.publicDescription,
          dateIncident: report.dateOccurred,
          timeIncident: report.timeOccurred || null,
          collegeId: report.collegeId,
          campusId: report.campusId || null,
          locationDescription: report.locationBuilding,
          isPublic: true,
          depositedWithOffice: report.finderDepositedWithOffice || false,
          images: report.images.map((url, idx) => ({ url, isPrimary: idx === 0 })),
          privateEvidence: report.privateEvidence
            ? [
                {
                  evidenceType: 'PROPRIETARY_PROOF',
                  description: [
                    report.privateEvidence.uniqueIdentifiers,
                    report.privateEvidence.serialNumberSnippet,
                    report.privateEvidence.privateNotes,
                  ]
                    .filter(Boolean)
                    .join(' | '),
                  fileUrl: report.privateEvidence.proofOfPurchaseUrl || null,
                },
              ].filter((e) => e.description || e.fileUrl)
            : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit item report to server');
      }

      if (data.item) {
        report.id = data.item.id;
        report.referenceNumber = data.item.reportNumber;
        report.status = (data.item.status?.toLowerCase() || 'active') as ItemStatus;
      }

      saveReport(report);
      return report;
    } catch (e: any) {
      if (!isDemoAllowed) {
        throw e;
      }
      console.warn('Backend item creation error; persisting locally in demo mode:', e);
      saveReport(report);
      return report;
    }
  },

  async updateReport(id: string, updates: Partial<ItemReport>): Promise<ItemReport | null> {
    try {
      const payload: any = {};
      if (updates.title) payload.title = updates.title;
      if (updates.publicDescription) payload.description = updates.publicDescription;
      if (updates.status) {
        payload.status = updates.status === 'pending_claim' ? 'CLAIM_PENDING' : updates.status.toUpperCase();
      }

      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok && !isDemoAllowed) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update item report on server');
      }
    } catch (e: any) {
      if (!isDemoAllowed) throw e;
    }

    const existing = await this.getReportById(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    saveReport(updated);
    return updated;
  },

  async deleteReport(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!res.ok && !isDemoAllowed) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete report on server');
      }
    } catch (e: any) {
      if (!isDemoAllowed) throw e;
    }
    deleteReport(id);
    return true;
  },

  async incrementViews(id: string): Promise<void> {
    const report = await this.getReportById(id);
    if (report) {
      report.viewsCount += 1;
      saveReport(report);
    }
  },
};
