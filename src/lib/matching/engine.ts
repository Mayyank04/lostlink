import { ItemReport } from '@/types/report';
import { MatchResult, MatchScoreBreakdown, AttributeScore } from '@/types/match';

/**
 * Normalizes text for comparison (lower case, trimmed, special characters removed)
 */
export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes text into word set
 */
export function tokenize(text?: string | null): Set<string> {
  const normalized = normalizeText(text);
  if (!normalized) return new Set();
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'with', 'of', 'for', 'to', 'my', 'is', 'it']);
  return new Set(
    normalized
      .split(' ')
      .filter((w) => w.length > 1 && !stopWords.has(w))
  );
}

/**
 * Jaccard token similarity (0.0 to 1.0)
 */
export function tokenSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) {
      intersection++;
    }
  });

  const union = new Set([...Array.from(tokensA), ...Array.from(tokensB)]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Evaluates Category Match (Max 25 pts)
 */
export function evaluateCategory(lost: ItemReport, found: ItemReport): AttributeScore {
  const matched = lost.category === found.category;
  return {
    name: 'Category Match',
    maxScore: 25,
    score: matched ? 25 : 0,
    matched,
    explanation: matched
      ? `Both items are classified under "${lost.category.replace('_', ' ')}"`
      : `Different categories: "${lost.category.replace('_', ' ')}" vs "${found.category.replace('_', ' ')}"`,
  };
}

/**
 * Evaluates Name & Title Similarity (Max 25 pts)
 */
export function evaluateNameSimilarity(lost: ItemReport, found: ItemReport): AttributeScore {
  const sim = tokenSimilarity(lost.title, found.title);
  
  // Also check if prominent tokens in title appear in description
  const lostTokens = tokenize(lost.title);
  const foundDescTokens = tokenize(found.publicDescription);
  let crossOverlap = 0;
  lostTokens.forEach((t) => {
    if (foundDescTokens.has(t)) crossOverlap++;
  });
  const crossBoost = lostTokens.size > 0 ? (crossOverlap / lostTokens.size) * 0.2 : 0;

  const totalSim = Math.min(1.0, sim + crossBoost);
  const score = Math.round(totalSim * 25);
  const matched = score >= 12;

  let explanation = '';
  if (score >= 20) {
    explanation = 'Strong title and item name keyword alignment';
  } else if (score >= 12) {
    explanation = 'Moderate name keyword overlap';
  } else if (score > 0) {
    explanation = 'Slight text overlap between reports';
  } else {
    explanation = 'No significant keywords shared in item names';
  }

  return {
    name: 'Name Similarity',
    maxScore: 25,
    score,
    matched,
    explanation,
  };
}

/**
 * Evaluates Color Similarity (Max 15 pts)
 */
export function evaluateColor(lost: ItemReport, found: ItemReport): AttributeScore {
  const lostColor = normalizeText(lost.color);
  const foundColor = normalizeText(found.color);

  if (!lostColor || !foundColor) {
    return {
      name: 'Color Alignment',
      maxScore: 15,
      score: 5,
      matched: false,
      explanation: 'Color details not fully specified in both reports',
    };
  }

  const exactMatch = lostColor === foundColor || lostColor.includes(foundColor) || foundColor.includes(lostColor);
  
  // Check secondary colors if provided
  let secondaryMatch = false;
  if (lost.secondaryColor && found.secondaryColor) {
    const lSec = normalizeText(lost.secondaryColor);
    const fSec = normalizeText(found.secondaryColor);
    if (lSec === fSec || lSec.includes(fSec) || fSec.includes(lSec)) {
      secondaryMatch = true;
    }
  }

  let score = 0;
  let explanation = '';

  if (exactMatch) {
    score = 15;
    explanation = `Primary colors match (${lost.color})`;
  } else if (secondaryMatch) {
    score = 10;
    explanation = `Secondary color attribute matches (${lost.secondaryColor})`;
  } else {
    score = 0;
    explanation = `Colors do not match: "${lost.color}" vs "${found.color}"`;
  }

  return {
    name: 'Color Alignment',
    maxScore: 15,
    score,
    matched: score >= 10,
    explanation,
  };
}

/**
 * Evaluates Brand Similarity (Max 10 pts)
 */
export function evaluateBrand(lost: ItemReport, found: ItemReport): AttributeScore {
  const lostBrand = normalizeText(lost.brand);
  const foundBrand = normalizeText(found.brand);

  if (!lostBrand && !foundBrand) {
    return {
      name: 'Brand Alignment',
      maxScore: 10,
      score: 5,
      matched: true,
      explanation: 'Neither report specifies a brand; neutral evaluation',
    };
  }

  if (!lostBrand || !foundBrand) {
    return {
      name: 'Brand Alignment',
      maxScore: 10,
      score: 3,
      matched: false,
      explanation: 'Brand was specified in only one report',
    };
  }

  const matched = lostBrand === foundBrand || lostBrand.includes(foundBrand) || foundBrand.includes(lostBrand);
  return {
    name: 'Brand Alignment',
    maxScore: 10,
    score: matched ? 10 : 0,
    matched,
    explanation: matched
      ? `Brand match confirmed (${lost.brand})`
      : `Different brands: "${lost.brand}" vs "${found.brand}"`,
  };
}

/**
 * Evaluates Location & Campus (Max 15 pts)
 */
export function evaluateLocation(lost: ItemReport, found: ItemReport): AttributeScore {
  // Cross-college check
  if (lost.collegeId !== found.collegeId) {
    return {
      name: 'Campus Location',
      maxScore: 15,
      score: 0,
      matched: false,
      explanation: 'Items were reported at different institutions',
    };
  }

  // Same college, compare campus and building
  if (lost.campusId !== found.campusId) {
    return {
      name: 'Campus Location',
      maxScore: 15,
      score: 4,
      matched: false,
      explanation: 'Same college, but different campuses reported',
    };
  }

  const normLostBldg = normalizeText(lost.locationBuilding);
  const normFoundBldg = normalizeText(found.locationBuilding);

  if (normLostBldg === normFoundBldg) {
    return {
      name: 'Campus Location',
      maxScore: 15,
      score: 15,
      matched: true,
      explanation: `Reported in the exact same facility (${lost.locationBuilding})`,
    };
  }

  const tokenSim = tokenSimilarity(normLostBldg, normFoundBldg);
  if (tokenSim > 0.4) {
    return {
      name: 'Campus Location',
      maxScore: 15,
      score: 10,
      matched: true,
      explanation: `Related campus location (${lost.locationBuilding} / ${found.locationBuilding})`,
    };
  }

  return {
    name: 'Campus Location',
    maxScore: 15,
    score: 6,
    matched: true,
    explanation: `Same campus, but different buildings (${lost.locationBuilding} vs ${found.locationBuilding})`,
  };
}

/**
 * Evaluates Time Plausibility (Max 10 pts)
 * An item must be lost BEFORE or on the same day it is found.
 * If found date is earlier than lost date by > 1 day, it is implausible.
 */
export function evaluateTimePlausibility(lost: ItemReport, found: ItemReport): AttributeScore {
  const lostDate = new Date(lost.dateOccurred).getTime();
  const foundDate = new Date(found.dateOccurred).getTime();

  if (isNaN(lostDate) || isNaN(foundDate)) {
    return {
      name: 'Time Plausibility',
      maxScore: 10,
      score: 5,
      matched: false,
      explanation: 'Unable to parse report dates accurately',
    };
  }

  const diffDays = Math.round((foundDate - lostDate) / (1000 * 60 * 60 * 24));

  // Found date is significantly before lost date: completely implausible
  if (diffDays < -1) {
    return {
      name: 'Time Plausibility',
      maxScore: 10,
      score: 0,
      matched: false,
      explanation: `Implausible timeline: item found ${Math.abs(diffDays)} days BEFORE the reported lost date`,
    };
  }

  // Found on same day or within 3 days: high plausibility
  if (diffDays >= 0 && diffDays <= 3) {
    return {
      name: 'Time Plausibility',
      maxScore: 10,
      score: 10,
      matched: true,
      explanation: diffDays === 0
        ? 'Reported found on the exact same day it was lost'
        : `Found ${diffDays} day(s) after being reported lost`,
    };
  }

  // Found within 14 days
  if (diffDays > 3 && diffDays <= 14) {
    return {
      name: 'Time Plausibility',
      maxScore: 10,
      score: 7,
      matched: true,
      explanation: `Found within ${diffDays} days of being reported lost`,
    };
  }

  // Found within 30 days
  if (diffDays > 14 && diffDays <= 45) {
    return {
      name: 'Time Plausibility',
      maxScore: 10,
      score: 4,
      matched: true,
      explanation: `Found ${diffDays} days later; plausible but extended timeframe`,
    };
  }

  return {
    name: 'Time Plausibility',
    maxScore: 10,
    score: 1,
    matched: false,
    explanation: `Found ${diffDays} days later; long gap between occurrences`,
  };
}

/**
 * Calculates deterministic match score between a Lost report and a Found report.
 * Strictly enforces that one is lost and one is found.
 */
export function calculateMatchScore(reportA: ItemReport, reportB: ItemReport): MatchResult | null {
  // Enforce complementary types (one must be 'lost' and other 'found')
  if (reportA.type === reportB.type) {
    return null; // Same report type cannot be matched
  }

  const lost = reportA.type === 'lost' ? reportA : reportB;
  const found = reportA.type === 'found' ? reportA : reportB;

  const categoryScore = evaluateCategory(lost, found);
  const nameScore = evaluateNameSimilarity(lost, found);
  const colorScore = evaluateColor(lost, found);
  const brandScore = evaluateBrand(lost, found);
  const locationScore = evaluateLocation(lost, found);
  const timeScore = evaluateTimePlausibility(lost, found);

  const breakdown: MatchScoreBreakdown = {
    category: categoryScore,
    nameSimilarity: nameScore,
    color: colorScore,
    brand: brandScore,
    location: locationScore,
    timePlausibility: timeScore,
  };

  // If categories are completely different, heavily penalize or cap
  let totalScore =
    categoryScore.score +
    nameScore.score +
    colorScore.score +
    brandScore.score +
    locationScore.score +
    timeScore.score;

  // Cross-college penalty if institutions don't match
  if (lost.collegeId !== found.collegeId) {
    totalScore = Math.min(totalScore, 30);
  }

  // Different category hard cap
  if (!categoryScore.matched) {
    totalScore = Math.min(totalScore, 20);
  }

  // Incompatible date penalty
  if (timeScore.score === 0 && !timeScore.matched) {
    totalScore = Math.min(totalScore, 25);
  }

  // High, medium, low confidence tier
  let confidenceTier: 'high' | 'medium' | 'low' = 'low';
  if (totalScore >= 75) {
    confidenceTier = 'high';
  } else if (totalScore >= 50) {
    confidenceTier = 'medium';
  }

  const matchingAttributes: string[] = [];
  const differingAttributes: string[] = [];

  Object.values(breakdown).forEach((attr) => {
    if (attr.matched) {
      matchingAttributes.push(attr.name);
    } else {
      differingAttributes.push(attr.name);
    }
  });

  return {
    id: `MATCH-${lost.id.slice(0, 8)}-${found.id.slice(0, 8)}`,
    lostReportId: lost.id,
    foundReportId: found.id,
    lostReport: lost,
    foundReport: found,
    totalScore: Math.max(0, Math.min(100, totalScore)),
    confidenceTier,
    breakdown,
    matchingAttributes,
    differingAttributes,
    isDismissed: false,
    hasClaimInitiated: false,
    createdAt: new Date().toISOString(),
  };
}

