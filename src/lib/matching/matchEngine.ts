import { prisma } from '@/lib/db';
import { Item, ItemReportType, ItemStatus } from '@prisma/client';

// ------------------------------------------------------------------------------
// CENTRALIZED CONFIGURABLE MATCHING WEIGHTS & THRESHOLDS (PART 2.1 & 2.3)
// ------------------------------------------------------------------------------

export const MATCH_CONFIG = {
  RULE_VERSION: 2,
  WEIGHTS: {
    CATEGORY: 25,
    NAME_SIMILARITY: 25,
    COLOR: 15,
    BRAND: 10,
    LOCATION: 15,
    CHRONOLOGY: 10,
  },
  THRESHOLDS: {
    STRONG_MATCH: 80,
    POSSIBLE_MATCH: 60,
    MINIMUM_PERSISTENCE: 55, // Only persist matches with score >= 55
  },
} as const;

// Standardized synonym dictionary for equipment, accessories, and campus items
const SYNONYM_GROUPS: string[][] = [
  ['earbuds', 'earphones', 'wireless earphones', 'airpods', 'headphones', 'headset', 'buds'],
  ['laptop', 'macbook', 'notebook', 'thinkpad', 'chromebook', 'ultrabook'],
  ['phone', 'smartphone', 'iphone', 'galaxy', 'cellphone', 'mobile'],
  ['water bottle', 'bottle', 'flask', 'tumbler', 'hydroflask', 'thermos'],
  ['backpack', 'bag', 'rucksack', 'bookbag', 'knapsack', 'tote'],
  ['id card', 'student id', 'campus card', 'badge', 'keycard', 'student card', 'access card'],
  ['wallet', 'purse', 'billfold', 'cardholder', 'pouch'],
  ['charger', 'adapter', 'charging cable', 'power bank', 'magsafe', 'cord'],
  ['keys', 'keychain', 'car key', 'dorm key', 'room key', 'lanyard'],
  ['glasses', 'sunglasses', 'spectacles', 'eyewear', 'shades', 'frames'],
  ['watch', 'smartwatch', 'apple watch', 'fitbit', 'timepiece'],
  ['jacket', 'hoodie', 'coat', 'sweater', 'sweatshirt', 'fleece', 'windbreaker'],
  ['umbrella', 'parasol', 'rain umbrella'],
  ['calculator', 'scientific calculator', 'graphing calculator', 'ti84'],
];

// Color alias mappings
const COLOR_ALIASES: Record<string, string[]> = {
  black: ['charcoal', 'midnight', 'jet', 'dark grey', 'matte black', 'obsidian'],
  blue: ['navy', 'cyan', 'royal blue', 'sky blue', 'indigo', 'azure', 'teal', 'cobalt'],
  grey: ['gray', 'silver', 'space gray', 'space grey', 'titanium', 'ash', 'slate'],
  white: ['ivory', 'pearl', 'cream', 'chalk', 'starlight'],
  red: ['crimson', 'maroon', 'burgundy', 'scarlet', 'ruby'],
  green: ['olive', 'emerald', 'forest green', 'sage', 'mint'],
  brown: ['tan', 'khaki', 'beige', 'bronze', 'camel', 'chocolate'],
  purple: ['violet', 'lavender', 'magenta', 'plum'],
  yellow: ['gold', 'mustard', 'amber'],
  pink: ['rose', 'coral', 'blush', 'salmon'],
};

export interface AttributeScoreBreakdown {
  name: string;
  score: number;
  maxScore: number;
  matched: boolean;
  explanation: string;
}

export interface MatchScoringResult {
  totalScore: number;
  confidenceTier: 'strong' | 'possible' | 'low';
  eligible: boolean;
  ineligibilityReason?: string;
  breakdown: {
    category: AttributeScoreBreakdown;
    nameSimilarity: AttributeScoreBreakdown;
    color: AttributeScoreBreakdown;
    brand: AttributeScoreBreakdown;
    location: AttributeScoreBreakdown;
    chronology: AttributeScoreBreakdown;
  };
  matchingAttributes: string[];
  differingAttributes: string[];
  safeExplanation: string;
}

// ------------------------------------------------------------------------------
// DETERMINISTIC STRING NORMALIZATION & TOKENIZATION
// ------------------------------------------------------------------------------

export function cleanText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractTokens(input: string): string[] {
  const STOPWORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'with', 'by', 'for',
    'my', 'lost', 'found', 'item', 'belonging', 'near', 'inside', 'around',
  ]);
  return cleanText(input)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Checks if two words/phrases are known aliases or synonyms
 */
export function areSynonyms(wordA: string, wordB: string): boolean {
  if (wordA === wordB) return true;
  for (const group of SYNONYM_GROUPS) {
    const hasA = group.some((s) => s.includes(wordA) || wordA.includes(s));
    const hasB = group.some((s) => s.includes(wordB) || wordB.includes(s));
    if (hasA && hasB) return true;
  }
  return false;
}

/**
 * Checks if colors match directly or via standard color alias families
 */
export function colorsMatch(colorA?: string | null, colorB?: string | null): boolean {
  if (!colorA || !colorB) return false;
  const a = cleanText(colorA);
  const b = cleanText(colorB);

  if (a === b || a.includes(b) || b.includes(a)) return true;

  for (const [canonical, aliases] of Object.entries(COLOR_ALIASES)) {
    const matchesA = a === canonical || aliases.some((al) => a.includes(al));
    const matchesB = b === canonical || aliases.some((al) => b.includes(al));
    if (matchesA && matchesB) return true;
  }

  return false;
}

/**
 * Ensures distinct product models (e.g. iPhone 15 vs iPhone 16) are not falsely equated
 */
export function extractModelNumbers(text: string): string[] {
  const matches = text.match(/\b\d+([a-z]?)\b/gi);
  return matches ? matches.map((m) => m.toLowerCase()) : [];
}

/**
 * Calculates deterministic name similarity using token overlap, synonym awareness,
 * and distinct model number mismatch detection.
 */
export function calculateNameSimilarity(nameA: string, nameB: string, descA = '', descB = ''): {
  score: number;
  matched: boolean;
  explanation: string;
} {
  const tokensA = extractTokens(nameA);
  const tokensB = extractTokens(nameB);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return { score: 0, matched: false, explanation: 'Insufficient item title details provided.' };
  }

  // Model number conflict check: e.g. "iPhone 15" vs "iPhone 16"
  const modelsA = extractModelNumbers(nameA);
  const modelsB = extractModelNumbers(nameB);
  const hasDistinctModelConflict =
    modelsA.length > 0 &&
    modelsB.length > 0 &&
    !modelsA.some((m) => modelsB.includes(m));

  if (hasDistinctModelConflict) {
    return {
      score: 0,
      matched: false,
      explanation: `Differing model generation numbers detected ("${modelsA.join(', ')}" vs "${modelsB.join(', ')}").`,
    };
  }

  let matchedTokens = 0;
  for (const tA of tokensA) {
    const hasMatch = tokensB.some((tB) => areSynonyms(tA, tB));
    if (hasMatch) {
      matchedTokens++;
    }
  }

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  let overlapRatio = unionSize > 0 ? matchedTokens / unionSize : 0;

  // Secondary check: description keyword boost
  const descTokensA = extractTokens(descA);
  const descTokensB = extractTokens(descB);
  let descBonus = 0;
  for (const dtA of descTokensA) {
    if (descTokensB.some((dtB) => areSynonyms(dtA, dtB))) {
      descBonus += 0.05;
    }
  }

  const finalRatio = Math.min(1, overlapRatio + descBonus);
  const score = Math.round(finalRatio * MATCH_CONFIG.WEIGHTS.NAME_SIMILARITY);

  return {
    score,
    matched: score >= 12,
    explanation:
      score >= 18
        ? 'High keyword and terminology similarity between item names.'
        : score >= 12
        ? 'Partial keyword match or related product terms detected.'
        : 'Low text similarity between reported item names.',
  };
}

// ------------------------------------------------------------------------------
// COMPREHENSIVE MATCH EVALUATION ENGINE (PART 2.1, 2.2, 2.3)
// ------------------------------------------------------------------------------

export function evaluateItemMatch(lostItem: Item, foundItem: Item): MatchScoringResult {
  // Eligibility Check (Part 2.2)
  if (lostItem.type !== ItemReportType.LOST || foundItem.type !== ItemReportType.FOUND) {
    return {
      totalScore: 0,
      confidenceTier: 'low',
      eligible: false,
      ineligibilityReason: 'Matches can only be evaluated between a LOST report and a FOUND report.',
      breakdown: {} as any,
      matchingAttributes: [],
      differingAttributes: [],
      safeExplanation: 'Ineligible pair comparison.',
    };
  }

  // Prevent self-match abuse if reported by same student
  if (lostItem.reporterId === foundItem.reporterId) {
    return {
      totalScore: 0,
      confidenceTier: 'low',
      eligible: false,
      ineligibilityReason: 'Cannot match reports submitted by the same user account.',
      breakdown: {} as any,
      matchingAttributes: [],
      differingAttributes: [],
      safeExplanation: 'Self-reporting match excluded.',
    };
  }

  const matchingAttributes: string[] = [];
  const differingAttributes: string[] = [];
  let totalScore = 0;

  // 1. Category (Max 25 pts)
  const normCatLost = cleanText(lostItem.category);
  const normCatFound = cleanText(foundItem.category);
  const categoryMatched =
    normCatLost === normCatFound || areSynonyms(normCatLost, normCatFound);
  const categoryScore = categoryMatched ? MATCH_CONFIG.WEIGHTS.CATEGORY : 0;
  totalScore += categoryScore;

  if (categoryMatched) {
    matchingAttributes.push('Category');
  } else {
    differingAttributes.push('Category');
  }

  // If categories are completely unrelated, cap similarity strictly
  const categoryBreakdown: AttributeScoreBreakdown = {
    name: 'Item Category',
    score: categoryScore,
    maxScore: MATCH_CONFIG.WEIGHTS.CATEGORY,
    matched: categoryMatched,
    explanation: categoryMatched
      ? `Identical or compatible category: "${lostItem.category}".`
      : `Different categories: "${lostItem.category}" vs "${foundItem.category}".`,
  };

  // 2. Name Similarity (Max 25 pts)
  const nameResult = calculateNameSimilarity(
    lostItem.name,
    foundItem.name,
    lostItem.description,
    foundItem.description
  );
  totalScore += nameResult.score;
  if (nameResult.matched) {
    matchingAttributes.push('Item Name');
  } else {
    differingAttributes.push('Item Name');
  }

  const nameBreakdown: AttributeScoreBreakdown = {
    name: 'Item Name & Keywords',
    score: nameResult.score,
    maxScore: MATCH_CONFIG.WEIGHTS.NAME_SIMILARITY,
    matched: nameResult.matched,
    explanation: nameResult.explanation,
  };

  // 3. Color (Max 15 pts)
  let colorScore = 0;
  let colorMatched = false;
  let colorExplanation = 'No color specified in one or both reports.';

  if (lostItem.color && foundItem.color) {
    if (colorsMatch(lostItem.color, foundItem.color)) {
      colorScore = MATCH_CONFIG.WEIGHTS.COLOR;
      colorMatched = true;
      colorExplanation = `Matching or compatible color profile: "${lostItem.color}".`;
      matchingAttributes.push('Color');
    } else {
      colorScore = 0;
      colorMatched = false;
      colorExplanation = `Different colors reported: "${lostItem.color}" vs "${foundItem.color}".`;
      differingAttributes.push('Color');
    }
  }
  totalScore += colorScore;

  const colorBreakdown: AttributeScoreBreakdown = {
    name: 'Color Profile',
    score: colorScore,
    maxScore: MATCH_CONFIG.WEIGHTS.COLOR,
    matched: colorMatched,
    explanation: colorExplanation,
  };

  // 4. Brand / Manufacturer (Max 10 pts)
  let brandScore = 0;
  let brandMatched = false;
  let brandExplanation = 'Brand not specified on one or both items.';

  if (lostItem.brand && foundItem.brand) {
    const brandA = cleanText(lostItem.brand);
    const brandB = cleanText(foundItem.brand);
    if (brandA === brandB || brandA.includes(brandB) || brandB.includes(brandA)) {
      brandScore = MATCH_CONFIG.WEIGHTS.BRAND;
      brandMatched = true;
      brandExplanation = `Exact brand match: ${lostItem.brand}.`;
      matchingAttributes.push('Brand');
    } else {
      brandScore = 0;
      brandMatched = false;
      brandExplanation = `Differing brands: "${lostItem.brand}" vs "${foundItem.brand}".`;
      differingAttributes.push('Brand');
    }
  } else {
    // Missing brand contributes 0 points (no assumption per Part 2.2)
    brandScore = 0;
    brandExplanation = 'Brand was omitted; neutral zero contribution applied.';
  }
  totalScore += brandScore;

  const brandBreakdown: AttributeScoreBreakdown = {
    name: 'Brand & Manufacturer',
    score: brandScore,
    maxScore: MATCH_CONFIG.WEIGHTS.BRAND,
    matched: brandMatched,
    explanation: brandExplanation,
  };

  // 5. Campus Location (Max 15 pts)
  let locationScore = 0;
  let locationMatched = false;
  let locationExplanation = 'Reported in different institutions or locations.';

  if (lostItem.collegeId === foundItem.collegeId) {
    if (lostItem.campusId === foundItem.campusId) {
      // Check building similarity
      const bldgA = cleanText(lostItem.locationBuilding);
      const bldgB = cleanText(foundItem.locationBuilding);
      if (bldgA === bldgB || bldgA.includes(bldgB) || bldgB.includes(bldgA)) {
        locationScore = MATCH_CONFIG.WEIGHTS.LOCATION; // 15 pts
        locationMatched = true;
        locationExplanation = `Reported in the exact same facility: "${lostItem.locationBuilding}".`;
        matchingAttributes.push('Building Facility');
      } else {
        locationScore = 10; // 10 pts for same campus
        locationMatched = true;
        locationExplanation = `Reported on the same campus branch, nearby facilities.`;
        matchingAttributes.push('Campus Quad');
      }
    } else {
      locationScore = 5; // 5 pts for same college
      locationExplanation = 'Reported at different campuses of the same university.';
      differingAttributes.push('Campus');
    }
  } else {
    differingAttributes.push('College');
  }
  totalScore += locationScore;

  const locationBreakdown: AttributeScoreBreakdown = {
    name: 'Campus Facility Proximity',
    score: locationScore,
    maxScore: MATCH_CONFIG.WEIGHTS.LOCATION,
    matched: locationMatched,
    explanation: locationExplanation,
  };

  // 6. Chronology / Timeline Plausibility (Max 10 pts)
  let chronologyScore = 0;
  let chronologyMatched = false;
  let chronologyExplanation = '';

  const lostTime = new Date(lostItem.occurredAt).getTime();
  const foundTime = new Date(foundItem.occurredAt).getTime();
  const hoursDifference = (foundTime - lostTime) / (1000 * 3600);

  if (hoursDifference >= 0) {
    // Found after lost -> logically plausible
    chronologyScore = MATCH_CONFIG.WEIGHTS.CHRONOLOGY;
    chronologyMatched = true;
    chronologyExplanation = 'Timeline is plausible (item found after reported loss date).';
    matchingAttributes.push('Chronology');
  } else if (hoursDifference >= -24) {
    // Found within 24 hours prior -> approximate reporting time tolerance
    chronologyScore = 5;
    chronologyMatched = true;
    chronologyExplanation = 'Approximate timeline match within 24-hour reporting margin of error.';
    matchingAttributes.push('Approximate Timeline');
  } else {
    // Found significantly before lost -> chronologically implausible
    chronologyScore = 0;
    chronologyMatched = false;
    chronologyExplanation = 'Chronological mismatch: Item was found days before the reported loss date.';
    differingAttributes.push('Date Timeline');
  }
  totalScore += chronologyScore;

  const chronologyBreakdown: AttributeScoreBreakdown = {
    name: 'Timeline Plausibility',
    score: chronologyScore,
    maxScore: MATCH_CONFIG.WEIGHTS.CHRONOLOGY,
    matched: chronologyMatched,
    explanation: chronologyExplanation,
  };

  totalScore = Math.min(100, Math.max(0, totalScore));

  const confidenceTier: 'strong' | 'possible' | 'low' =
    totalScore >= MATCH_CONFIG.THRESHOLDS.STRONG_MATCH
      ? 'strong'
      : totalScore >= MATCH_CONFIG.THRESHOLDS.POSSIBLE_MATCH
      ? 'possible'
      : 'low';

  const safeExplanation =
    matchingAttributes.length > 0
      ? `Alignment detected on: ${matchingAttributes.join(', ')}.`
      : 'Low attribute similarity between reports.';

  return {
    totalScore,
    confidenceTier,
    eligible: true,
    breakdown: {
      category: categoryBreakdown,
      nameSimilarity: nameBreakdown,
      color: colorBreakdown,
      brand: brandBreakdown,
      location: locationBreakdown,
      chronology: chronologyBreakdown,
    },
    matchingAttributes,
    differingAttributes,
    safeExplanation,
  };
}

// ------------------------------------------------------------------------------
// CANDIDATE DISCOVERY & PERSISTENCE ENGINE (PART 2.4 & 2.5)
// ------------------------------------------------------------------------------

/**
 * Executes indexed candidate queries to find potential matches without all-pairs scans
 */
export async function triggerMatchingEngineForItem(newItemId: string): Promise<number> {
  const item = await prisma.item.findUnique({
    where: { id: newItemId },
  });

  if (!item || item.status !== ItemStatus.OPEN) return 0;

  const oppositeType = item.type === ItemReportType.LOST ? ItemReportType.FOUND : ItemReportType.LOST;

  // Narrow candidates using indexed database fields (collegeId, type, status)
  const candidates = await prisma.item.findMany({
    where: {
      collegeId: item.collegeId,
      type: oppositeType,
      status: ItemStatus.OPEN,
      // Exclude reports by the same student
      reporterId: { not: item.reporterId },
      // Exclude archived items
      isArchived: false,
    },
    take: 50, // Bounded workload
  });

  let matchedCount = 0;

  for (const candidate of candidates) {
    const lostItem = item.type === ItemReportType.LOST ? item : candidate;
    const foundItem = item.type === ItemReportType.FOUND ? item : candidate;

    const evaluation = evaluateItemMatch(lostItem, foundItem);

    if (evaluation.eligible && evaluation.totalScore >= MATCH_CONFIG.THRESHOLDS.MINIMUM_PERSISTENCE) {
      matchedCount++;
      // Upsert match record
      const matchRecord = await prisma.match.upsert({
        where: {
          lostItemId_foundItemId: {
            lostItemId: lostItem.id,
            foundItemId: foundItem.id,
          },
        },
        update: {
          score: evaluation.totalScore,
          explanation: JSON.stringify({
            breakdown: evaluation.breakdown,
            matchingAttributes: evaluation.matchingAttributes,
            differingAttributes: evaluation.differingAttributes,
            confidenceTier: evaluation.confidenceTier,
            safeExplanation: evaluation.safeExplanation,
          }),
          status: 'ACTIVE',
          ruleVersion: MATCH_CONFIG.RULE_VERSION,
          collegeId: item.collegeId,
        },
        create: {
          lostItemId: lostItem.id,
          foundItemId: foundItem.id,
          score: evaluation.totalScore,
          explanation: JSON.stringify({
            breakdown: evaluation.breakdown,
            matchingAttributes: evaluation.matchingAttributes,
            differingAttributes: evaluation.differingAttributes,
            confidenceTier: evaluation.confidenceTier,
            safeExplanation: evaluation.safeExplanation,
          }),
          status: 'ACTIVE',
          ruleVersion: MATCH_CONFIG.RULE_VERSION,
          collegeId: item.collegeId,
        },
      });

      // Update item statuses to POTENTIAL_MATCH if they are currently OPEN
      if (item.status === ItemStatus.OPEN) {
        await prisma.item.update({
          where: { id: item.id },
          data: { status: ItemStatus.POTENTIAL_MATCH },
        }).catch(() => {});
      }

      const notifType =
        evaluation.totalScore >= MATCH_CONFIG.THRESHOLDS.STRONG_MATCH ? 'strong_match' : 'match_found';

      const notifications = [
        {
          userId: lostItem.reporterId,
          title: evaluation.totalScore >= 80 ? 'Strong Match Detected! 🎯' : 'Potential Match Found',
          message: `Your lost "${lostItem.name}" has a ${evaluation.totalScore}% match with a recently found item.`,
          linkUrl: `/matches`,
        },
        {
          userId: foundItem.reporterId,
          title: 'Potential Owner Match Found',
          message: `Your turned-in "${foundItem.name}" has a ${evaluation.totalScore}% match with a student's lost report.`,
          linkUrl: `/matches`,
        },
      ];

      for (const n of notifications) {
        // Prevent duplicate spam notifications for same resource
        const existing = await prisma.notification.findFirst({
          where: {
            userId: n.userId,
            resourceId: matchRecord.id,
          },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: n.userId,
              type: notifType,
              title: n.title,
              message: n.message,
              resourceId: matchRecord.id,
              linkUrl: n.linkUrl,
            },
          }).catch(() => {});
        }
      }
    }
  }

  return matchedCount;
}

/**
 * Recalculates all active matches for an institution or specific report
 */
export async function recalculateMatchesForCollege(collegeId: string, limit = 100): Promise<{ processed: number; matchesCreated: number }> {
  const lostItems = await prisma.item.findMany({
    where: {
      collegeId,
      type: ItemReportType.LOST,
      status: { in: [ItemStatus.OPEN, ItemStatus.POTENTIAL_MATCH] },
      isArchived: false,
    },
    take: limit,
  });

  let matchesCreated = 0;
  for (const lost of lostItems) {
    await triggerMatchingEngineForItem(lost.id);
    matchesCreated++;
  }

  return { processed: lostItems.length, matchesCreated };
}
