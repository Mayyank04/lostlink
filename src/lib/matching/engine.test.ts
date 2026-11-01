import { describe, it, expect } from 'vitest';
import { calculateMatchScore } from './engine';
import { ItemReport } from '@/types/report';

const baseLostItem: ItemReport = {
  id: 'lost-101',
  referenceNumber: 'LL-2026-101',
  type: 'lost',
  title: 'Apple MacBook Pro 14" Space Gray',
  category: 'electronics',
  brand: 'Apple',
  color: 'Space Gray',
  publicDescription: 'Left on desk with sticker of Python logo on back',
  collegeId: 'college-apex',
  campusId: 'apex-north',
  locationBuilding: 'Engineering Hall',
  locationRoomOrSpecifics: 'Lab 302',
  dateOccurred: '2026-10-10',
  timeOccurred: '14:30',
  images: ['/mock/macbook.jpg'],
  reporterId: 'user-1',
  reporterName: 'Alex Morgan',
  reporterEmail: 'alex@apex.edu',
  status: 'active',
  moderationStatus: 'approved',
  viewsCount: 12,
  createdAt: '2026-10-10T15:00:00Z',
  updatedAt: '2026-10-10T15:00:00Z',
};

const baseFoundItem: ItemReport = {
  id: 'found-201',
  referenceNumber: 'FD-2026-201',
  type: 'found',
  title: 'MacBook Pro laptop',
  category: 'electronics',
  brand: 'Apple',
  color: 'Space Gray',
  publicDescription: 'Found near power outlet in computer lab',
  collegeId: 'college-apex',
  campusId: 'apex-north',
  locationBuilding: 'Engineering Hall',
  locationRoomOrSpecifics: 'Desk 12',
  dateOccurred: '2026-10-10',
  timeOccurred: '17:00',
  images: ['/mock/macbook-found.jpg'],
  finderDepositedWithOffice: true,
  reporterId: 'user-2',
  reporterName: 'Campus Security',
  reporterEmail: 'security@apex.edu',
  status: 'active',
  moderationStatus: 'approved',
  viewsCount: 5,
  createdAt: '2026-10-10T17:30:00Z',
  updatedAt: '2026-10-10T17:30:00Z',
};

describe('LostLink Deterministic Matching Engine', () => {
  it('calculates a high confidence score for exact / closely matching items', () => {
    const result = calculateMatchScore(baseLostItem, baseFoundItem);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.totalScore).toBeGreaterThanOrEqual(75);
    expect(result.confidenceTier).toBe('high');
    expect(result.breakdown.category.matched).toBe(true);
    expect(result.breakdown.brand.matched).toBe(true);
    expect(result.breakdown.location.matched).toBe(true);
    expect(result.breakdown.timePlausibility.matched).toBe(true);
  });

  it('rejects matches between same report types (e.g. lost vs lost, found vs found)', () => {
    const anotherLostItem: ItemReport = { ...baseLostItem, id: 'lost-102' };
    const result = calculateMatchScore(baseLostItem, anotherLostItem);
    expect(result).toBeNull();

    const anotherFoundItem: ItemReport = { ...baseFoundItem, id: 'found-202' };
    const resultFound = calculateMatchScore(baseFoundItem, anotherFoundItem);
    expect(resultFound).toBeNull();
  });

  it('gives low score and penalizes items with different categories', () => {
    const waterBottleFound: ItemReport = {
      ...baseFoundItem,
      id: 'found-203',
      title: 'Hydro Flask Water Bottle',
      category: 'water_bottles',
      brand: 'Hydro Flask',
      color: 'Black',
    };

    const result = calculateMatchScore(baseLostItem, waterBottleFound);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.breakdown.category.score).toBe(0);
    expect(result.breakdown.category.matched).toBe(false);
    expect(result.totalScore).toBeLessThanOrEqual(20);
    expect(result.confidenceTier).toBe('low');
  });

  it('handles missing attributes gracefully without crashing', () => {
    const noBrandLost: ItemReport = {
      ...baseLostItem,
      brand: undefined,
      secondaryColor: undefined,
      timeOccurred: undefined,
    };
    const noBrandFound: ItemReport = {
      ...baseFoundItem,
      brand: undefined,
      color: '',
    };

    const result = calculateMatchScore(noBrandLost, noBrandFound);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.breakdown.brand.score).toBeGreaterThan(0); // Neutral neutral score for missing brands
    expect(result.totalScore).toBeGreaterThan(0);
  });

  it('penalizes incompatible date order (found weeks before lost)', () => {
    const prematureFound: ItemReport = {
      ...baseFoundItem,
      dateOccurred: '2026-09-01', // Found 40 days BEFORE the item was lost on Oct 10
    };

    const result = calculateMatchScore(baseLostItem, prematureFound);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.breakdown.timePlausibility.score).toBe(0);
    expect(result.breakdown.timePlausibility.matched).toBe(false);
    expect(result.totalScore).toBeLessThanOrEqual(25);
  });

  it('penalizes cross-college reports across different institutions', () => {
    const differentCollegeFound: ItemReport = {
      ...baseFoundItem,
      collegeId: 'college-horizon', // Different institution
      campusId: 'horizon-main',
    };

    const result = calculateMatchScore(baseLostItem, differentCollegeFound);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.breakdown.location.score).toBe(0);
    expect(result.totalScore).toBeLessThanOrEqual(30);
  });

  it('calculates a moderate score for partial matches with different colors or building', () => {
    const partialFound: ItemReport = {
      ...baseFoundItem,
      color: 'Silver',
      locationBuilding: 'Campus Library', // Different building on same campus
      dateOccurred: '2026-10-18', // 8 days later
    };

    const result = calculateMatchScore(baseLostItem, partialFound);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.totalScore).toBeGreaterThan(25);
    expect(result.totalScore).toBeLessThan(75);
    expect(result.confidenceTier).toBe('medium');
  });
});

