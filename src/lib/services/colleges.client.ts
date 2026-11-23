import { College, Campus } from '@/types/college';
import { MOCK_COLLEGES } from '@/data/colleges';

/**
 * College & Campus Service
 */
export const CollegeService = {
  async getColleges(): Promise<College[]> {
    try {
      const res = await fetch('/api/colleges');
      if (res.ok) {
        const data = await res.json();
        if (data.colleges && data.colleges.length > 0) {
          return data.colleges.map((c: any) => ({
            id: c.id,
            name: c.name,
            shortName: c.slug.toUpperCase(),
            domain: c.domain || c.emailDomains?.[0] || 'edu',
            campuses: (c.campuses || []).map((camp: any) => ({
              id: camp.id,
              name: camp.name,
              code: camp.code,
              address: camp.addressLabel || '',
              buildings: [],
              dropOffPoints: [],
            })),
            colors: {
              primary: '#0F766E',
              accent: '#2563EB',
            },
          }));
        }
      }
    } catch {
      // Fallback
    }
    return MOCK_COLLEGES;
  },

  async getCollegeById(id: string): Promise<College | null> {
    const colleges = await this.getColleges();
    return colleges.find((c) => c.id === id) || null;
  },

  async getCampuses(collegeId: string): Promise<Campus[]> {
    const college = await this.getCollegeById(collegeId);
    return college ? college.campuses : [];
  },
};
