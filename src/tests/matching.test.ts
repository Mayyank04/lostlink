import { describe, it, expect } from 'vitest';
import { evaluateItemMatch, MATCH_CONFIG } from '@/lib/matching/matchEngine';
import { ItemReportType, ItemStatus, Item } from '@prisma/client';

describe('Phase 3 100-Point Explainable Matching Engine', () => {
  const baseLost: Item = {
    id: 'lost-test-1',
    reportNumber: 'LL-2026-001',
    reporterId: 'user-student-alex',
    collegeId: 'college-apex',
    campusId: 'apex-north',
    locationId: null,
    locationBuilding: 'Engineering Hall',
    locationSpecifics: 'Lab 302',
    type: ItemReportType.LOST,
    name: 'Apple MacBook Pro 14" Space Gray',
    category: 'electronics',
    brand: 'Apple',
    color: 'Space Gray',
    secondaryColor: null,
    description: 'Left on desk in engineering lab with stickers',
    occurredAt: new Date('2026-10-10T14:00:00Z'),
    reportedAt: new Date('2026-10-10T14:30:00Z'),
    status: ItemStatus.OPEN,
    depositedWithOffice: false,
    officeLocationNotes: null,
    viewsCount: 5,
    isArchived: false,
    createdAt: new Date('2026-10-10T14:30:00Z'),
    updatedAt: new Date('2026-10-10T14:30:00Z'),
  };

  const baseFound: Item = {
    id: 'found-test-1',
    reportNumber: 'FD-2026-001',
    reporterId: 'user-officer-sarah', // Different reporter
    collegeId: 'college-apex',
    campusId: 'apex-north',
    locationId: null,
    locationBuilding: 'Engineering Hall',
    locationSpecifics: 'Lab 302',
    type: ItemReportType.FOUND,
    name: 'MacBook Pro laptop',
    category: 'electronics',
    brand: 'Apple',
    color: 'Space Gray',
    secondaryColor: null,
    description: 'Found near power outlet in engineering lab',
    occurredAt: new Date('2026-10-10T16:00:00Z'), // Found 2 hours after lost
    reportedAt: new Date('2026-10-10T16:30:00Z'),
    status: ItemStatus.OPEN,
    depositedWithOffice: true,
    officeLocationNotes: 'Front Desk Rm 101',
    viewsCount: 2,
    isArchived: false,
    createdAt: new Date('2026-10-10T16:30:00Z'),
    updatedAt: new Date('2026-10-10T16:30:00Z'),
  };

  it('calculates a 100-point explainable match with exact category, brand, color, location, and chronology', () => {
    const result = evaluateItemMatch(baseLost, baseFound);

    expect(result.eligible).toBe(true);
    expect(result.totalScore).toBeGreaterThanOrEqual(80);
    expect(result.confidenceTier).toBe('strong');

    // Verify weights breakdown
    expect(result.breakdown.category.score).toBe(MATCH_CONFIG.WEIGHTS.CATEGORY); // 25
    expect(result.breakdown.brand.score).toBe(MATCH_CONFIG.WEIGHTS.BRAND); // 10
    expect(result.breakdown.color.score).toBe(MATCH_CONFIG.WEIGHTS.COLOR); // 15
    expect(result.breakdown.location.score).toBe(MATCH_CONFIG.WEIGHTS.LOCATION); // 15
    expect(result.breakdown.chronology.score).toBe(MATCH_CONFIG.WEIGHTS.CHRONOLOGY); // 10
  });

  it('strictly rejects matching reports of the same type (LOST vs LOST)', () => {
    const result = evaluateItemMatch(baseLost, { ...baseLost, id: 'lost-test-2', reporterId: 'user-other' });
    expect(result.eligible).toBe(false);
    expect(result.totalScore).toBe(0);
    expect(result.ineligibilityReason).toContain('LOST report and a FOUND report');
  });

  it('prevents self-match abuse when reported by the same user account', () => {
    const result = evaluateItemMatch(baseLost, { ...baseFound, reporterId: baseLost.reporterId });
    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReason).toContain('same user account');
  });

  it('supports semantic synonym dictionary expansion (e.g., earbuds <-> headphones)', () => {
    const lostEarbuds = {
      ...baseLost,
      name: 'Sony Wireless Earbuds',
      category: 'audio',
      brand: 'Sony',
      color: 'Black',
    };
    const foundHeadphones = {
      ...baseFound,
      name: 'Sony noise cancelling headphones',
      category: 'audio',
      brand: 'Sony',
      color: 'Black',
    };

    const result = evaluateItemMatch(lostEarbuds, foundHeadphones);
    expect(result.eligible).toBe(true);
    expect(result.breakdown.nameSimilarity.score).toBeGreaterThanOrEqual(10);
  });

  it('detects model number conflict (e.g., iPhone 15 vs iPhone 16) and penalizes score', () => {
    const lostIphone15 = {
      ...baseLost,
      name: 'Apple iPhone 15 Blue',
      category: 'electronics',
      brand: 'Apple',
      color: 'Blue',
    };
    const foundIphone16 = {
      ...baseFound,
      name: 'Apple iPhone 16 Blue',
      category: 'electronics',
      brand: 'Apple',
      color: 'Blue',
    };

    const result = evaluateItemMatch(lostIphone15, foundIphone16);
    // Name similarity should be penalized heavily due to distinct generation model numbers (15 vs 16)
    expect(result.breakdown.nameSimilarity.score).toBe(0);
    expect(result.totalScore).toBeLessThanOrEqual(75);
  });

  it('handles chronological plausibility (found before loss occurred awards 0 chronology points)', () => {
    const impossibleFound = {
      ...baseFound,
      occurredAt: new Date('2026-10-08T10:00:00Z'), // Found 2 days before lost!
    };
    const result = evaluateItemMatch(baseLost, impossibleFound);
    expect(result.breakdown.chronology.score).toBe(0);
    expect(result.breakdown.chronology.explanation).toContain('Chronological mismatch');
  });

  it('supports cross-campus bonus differentiation', () => {
    const diffCampusFound = {
      ...baseFound,
      campusId: 'different-campus',
      locationBuilding: 'Library Annex',
    };
    const result = evaluateItemMatch(baseLost, diffCampusFound);
    expect(result.breakdown.location.score).toBeLessThan(MATCH_CONFIG.WEIGHTS.LOCATION);
  });
});
