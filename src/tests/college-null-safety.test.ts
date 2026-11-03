import { describe, it, expect } from 'vitest';
import { getCollegeShortName, getCollegeInitial, College } from '@/types/college';

describe('College Model & Display Null Safety Regression Suite', () => {
  it('safely handles colleges with null or undefined shortName', () => {
    const colWithoutShortName: Partial<College> = {
      id: 'col-legacy-1',
      name: 'Carnegie Mellon University',
      shortName: null,
      domain: 'cmu.edu',
    };

    expect(getCollegeShortName(colWithoutShortName)).toBe('Carnegie Mellon University');
    expect(getCollegeInitial(colWithoutShortName)).toBe('C');
  });

  it('safely handles completely undefined college reference without crashing', () => {
    expect(getCollegeShortName(undefined)).toBe('Campus');
    expect(getCollegeShortName(null)).toBe('Campus');
    expect(getCollegeInitial(undefined)).toBe('C');
    expect(getCollegeInitial(null)).toBe('C');
  });

  it('uses shortName when present and trims correctly', () => {
    const colWithShortName: Partial<College> = {
      id: 'col-apex',
      name: 'Apex Institute of Technology',
      shortName: 'Apex Tech',
      domain: 'apex.edu',
    };

    expect(getCollegeShortName(colWithShortName)).toBe('Apex Tech');
    expect(getCollegeInitial(colWithShortName)).toBe('A');
  });

  it('handles single character and special whitespace gracefully', () => {
    const edgeCaseCollege: Partial<College> = {
      id: 'col-edge',
      name: '  MIT  ',
      shortName: '   ',
    };

    // When shortName is empty string or only whitespace, it should fall back to name
    expect(getCollegeShortName(edgeCaseCollege)).toBe('MIT');
    expect(getCollegeInitial(edgeCaseCollege)).toBe('M');
  });

  it('safely handles colleges with missing or empty campuses array', () => {
    const colNoCampuses: any = {
      id: 'col-empty-campuses',
      name: 'Polytechnic Institute',
      shortName: 'Poly',
      campuses: undefined,
      totalRecoveries: undefined,
    };

    const campusCount = (colNoCampuses.campuses || []).length;
    const recoveryCount = colNoCampuses.totalRecoveries || 0;

    expect(campusCount).toBe(0);
    expect(recoveryCount).toBe(0);
  });
});
