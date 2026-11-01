import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        lostItem: {
          include: {
            college: { select: { id: true, name: true } },
            campus: { select: { id: true, name: true } },
            images: true,
          },
        },
        foundItem: {
          include: {
            college: { select: { id: true, name: true } },
            campus: { select: { id: true, name: true } },
            images: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match record not found' }, { status: 404 });
    }

    const isParty = match.lostItem.reporterId === user.id || match.foundItem.reporterId === user.id;
    const isCollegeAdmin =
      user.role === UserRole.PLATFORM_ADMIN ||
      user.memberships.some(
        (m) =>
          m.collegeId === match.lostItem.collegeId &&
          (user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR)
      );

    if (!isParty && !isCollegeAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to view this match recommendation' },
        { status: 403 }
      );
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(match.explanation);
    } catch {
      parsed = {};
    }

    return NextResponse.json({
      match: {
        id: match.id,
        score: match.score,
        confidence: parsed.confidenceTier || (match.score >= 80 ? 'strong' : 'possible'),
        status: match.status,
        breakdown: parsed.breakdown || {},
        matchingAttrs: parsed.matchingAttributes || [],
        differingAttrs: parsed.differingAttributes || [],
        safeExplanation: parsed.safeExplanation,
        createdAt: match.createdAt.toISOString(),
        lostItem: {
          id: match.lostItem.id,
          reportNumber: match.lostItem.reportNumber,
          title: match.lostItem.name,
          category: match.lostItem.category,
          brand: match.lostItem.brand,
          color: match.lostItem.color,
          description: match.lostItem.description,
          dateIncident: match.lostItem.occurredAt.toISOString(),
          locationDescription: match.lostItem.locationBuilding,
          collegeName: match.lostItem.college.name,
          campusName: match.lostItem.campus?.name || null,
          imageUrl: match.lostItem.images[0]?.url || null,
          reporterId: match.lostItem.reporterId,
        },
        foundItem: {
          id: match.foundItem.id,
          reportNumber: match.foundItem.reportNumber,
          title: match.foundItem.name,
          category: match.foundItem.category,
          brand: match.foundItem.brand,
          color: match.foundItem.color,
          description: match.foundItem.description,
          dateIncident: match.foundItem.occurredAt.toISOString(),
          locationDescription: match.foundItem.locationBuilding,
          collegeName: match.foundItem.college.name,
          campusName: match.foundItem.campus?.name || null,
          imageUrl: match.foundItem.images[0]?.url || null,
          reporterId: match.foundItem.reporterId,
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

