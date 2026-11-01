import { prisma } from '@/lib/db';
import { Item, ItemReportType, ItemStatus } from '@prisma/client';

export interface ScoreDetail {
  name: string;
  score: number;
  maxScore: number;
  matched: boolean;
  explanation: string;
}

export interface MatchEvaluation {
  totalScore: number;
  confidenceTier: 'high' | 'medium' | 'low';
  breakdown: {
    category: ScoreDetail;
    nameSimilarity: ScoreDetail;
    color: ScoreDetail;
    brand: ScoreDetail;
    location: ScoreDetail;
    timePlausibility: ScoreDetail;
  };
  matchingAttributes: string[];
  differingAttributes: string[];
}

function calculateWordOverlap(strA: string, strB: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

  const setA = tokenize(strA);
  const setB = tokenize(strB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function evaluateItemMatch(lostItem: Item, foundItem: Item): MatchEvaluation {
  let totalScore = 0;
  const matchingAttributes: string[] = [];
  const differingAttributes: string[] = [];

  // 1. Category (30 pts)
  const categoryMatched =
    lostItem.category.trim().toLowerCase() === foundItem.category.trim().toLowerCase();
  const categoryScore = categoryMatched ? 30 : 0;
  totalScore += categoryScore;
  if (categoryMatched) {
    matchingAttributes.push('Category');
  } else {
    differingAttributes.push('Category');
  }

  // 2. Name / Description Similarity (25 pts)
  const titleOverlap = calculateWordOverlap(lostItem.name, foundItem.name);
  const descOverlap = calculateWordOverlap(
    lostItem.description || '',
    foundItem.description || ''
  );
  const combinedOverlap = Math.max(titleOverlap, (titleOverlap + descOverlap) / 2);
  const nameScore = Math.round(combinedOverlap * 25);
  totalScore += nameScore;
  if (nameScore >= 12) {
    matchingAttributes.push('Item Name');
  }

  // 3. Brand Match (15 pts)
  let brandScore = 0;
  let brandMatched = false;
  let brandExplanation = 'Brand not specified on one or both items.';

  if (lostItem.brand && foundItem.brand) {
    if (lostItem.brand.trim().toLowerCase() === foundItem.brand.trim().toLowerCase()) {
      brandScore = 15;
      brandMatched = true;
      brandExplanation = `Exact brand match: ${lostItem.brand}`;
      matchingAttributes.push('Brand');
    } else {
      brandScore = 0;
      brandMatched = false;
      brandExplanation = `Brands differ: "${lostItem.brand}" vs "${foundItem.brand}"`;
      differingAttributes.push('Brand');
    }
  } else {
    brandScore = 5;
    brandExplanation = 'Brand omitted in one report; neutral attribution applied.';
  }
  totalScore += brandScore;

  // 4. Color Match (15 pts)
  let colorScore = 0;
  let colorMatched = false;
  let colorExplanation = 'Color not specified.';

  if (lostItem.color && foundItem.color) {
    if (lostItem.color.trim().toLowerCase() === foundItem.color.trim().toLowerCase()) {
      colorScore = 15;
      colorMatched = true;
      colorExplanation = `Matching color: ${lostItem.color}`;
      matchingAttributes.push('Color');
    } else {
      colorScore = 0;
      colorMatched = false;
      colorExplanation = `Different colors reported: "${lostItem.color}" vs "${foundItem.color}"`;
      differingAttributes.push('Color');
    }
  }
  totalScore += colorScore;

  // 5. Location Proximity (10 pts)
  let locationScore = 0;
  let locationMatched = false;
  let locationExplanation = 'Different colleges or locations';

  if (lostItem.collegeId === foundItem.collegeId) {
    locationScore += 5;
    if (lostItem.campusId === foundItem.campusId) {
      locationScore += 5;
      locationMatched = true;
      locationExplanation = 'Reported on the exact same campus.';
      matchingAttributes.push('Campus Location');
    } else {
      locationExplanation = 'Reported within the same institution.';
      matchingAttributes.push('College');
    }
  } else {
    differingAttributes.push('College');
  }
  totalScore += locationScore;

  // 6. Time Plausibility (5 pts)
  let timeScore = 5;
  let timeMatched = true;
  let timeExplanation = 'Timeline is plausible.';

  const lostDate = new Date(lostItem.occurredAt).getTime();
  const foundDate = new Date(foundItem.occurredAt).getTime();
  const daysDiff = (foundDate - lostDate) / (1000 * 3600 * 24);

  if (daysDiff < -2) {
    timeScore = 0;
    timeMatched = false;
    timeExplanation = 'Item was found significantly before the reported lost date.';
    differingAttributes.push('Incident Date');
  } else {
    matchingAttributes.push('Timeline Plausibility');
  }
  totalScore += timeScore;

  totalScore = Math.min(100, Math.max(0, totalScore));

  const confidenceTier: 'high' | 'medium' | 'low' =
    totalScore >= 70 ? 'high' : totalScore >= 45 ? 'medium' : 'low';

  return {
    totalScore,
    confidenceTier,
    breakdown: {
      category: {
        name: 'Category Match',
        score: categoryScore,
        maxScore: 30,
        matched: categoryMatched,
        explanation: categoryMatched
          ? `Identical category: ${lostItem.category}`
          : `Different categories: ${lostItem.category} vs ${foundItem.category}`,
      },
      nameSimilarity: {
        name: 'Title & Keywords',
        score: nameScore,
        maxScore: 25,
        matched: nameScore >= 12,
        explanation: `${nameScore} / 25 keyword overlap score based on item title and details.`,
      },
      brand: {
        name: 'Brand Verification',
        score: brandScore,
        maxScore: 15,
        matched: brandMatched,
        explanation: brandExplanation,
      },
      color: {
        name: 'Color Assessment',
        score: colorScore,
        maxScore: 15,
        matched: colorMatched,
        explanation: colorExplanation,
      },
      location: {
        name: 'Campus Proximity',
        score: locationScore,
        maxScore: 10,
        matched: locationMatched,
        explanation: locationExplanation,
      },
      timePlausibility: {
        name: 'Date Plausibility',
        score: timeScore,
        maxScore: 5,
        matched: timeMatched,
        explanation: timeExplanation,
      },
    },
    matchingAttributes,
    differingAttributes,
  };
}

/**
 * Triggers match evaluation for a newly created or updated item against opposing items
 */
export async function triggerMatchingEngineForItem(newItemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: newItemId },
  });

  if (!item || item.status !== ItemStatus.OPEN) return;

  const oppositeType = item.type === ItemReportType.LOST ? ItemReportType.FOUND : ItemReportType.LOST;

  const candidates = await prisma.item.findMany({
    where: {
      collegeId: item.collegeId,
      type: oppositeType,
      status: ItemStatus.OPEN,
    },
  });

  for (const candidate of candidates) {
    const lostItem = item.type === ItemReportType.LOST ? item : candidate;
    const foundItem = item.type === ItemReportType.FOUND ? item : candidate;

    const evaluation = evaluateItemMatch(lostItem, foundItem);

    if (evaluation.totalScore >= 40) {
      await prisma.match.upsert({
        where: {
          lostItemId_foundItemId: {
            lostItemId: lostItem.id,
            foundItemId: foundItem.id,
          },
        },
        update: {
          score: evaluation.totalScore,
          explanation: JSON.stringify(evaluation),
          status: 'SUGGESTED',
        },
        create: {
          lostItemId: lostItem.id,
          foundItemId: foundItem.id,
          score: evaluation.totalScore,
          explanation: JSON.stringify(evaluation),
          status: 'SUGGESTED',
        },
      });

      // Notify users about match
      const notifyUsers = [
        { userId: lostItem.reporterId, text: `Potential match (${evaluation.totalScore}%) found for your lost "${lostItem.name}"!` },
        { userId: foundItem.reporterId, text: `Your found "${foundItem.name}" matches a reported lost item (${evaluation.totalScore}% match)!` },
      ];

      for (const n of notifyUsers) {
        await prisma.notification.create({
          data: {
            userId: n.userId,
            type: 'match_found',
            title: 'Potential Item Match Found',
            message: n.text,
            linkUrl: `/matches`,
          },
        }).catch(() => {});
      }
    }
  }
}
