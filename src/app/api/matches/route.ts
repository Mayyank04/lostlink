import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const collegeId = searchParams.get('collegeId');

    const isPlatformAdmin = user.role === UserRole.PLATFORM_ADMIN;
    const isCollegeAdmin = user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR;

    let whereClause: any = { status: { not: 'DISMISSED' } };

    if (isPlatformAdmin) {
      if (collegeId) whereClause.lostItem = { collegeId };
    } else if (isCollegeAdmin) {
      const adminCollegeIds = user.memberships.map((m) => m.collegeId);
      whereClause.lostItem = { collegeId: { in: adminCollegeIds } };
    } else {
      whereClause.OR = [
        { lostItem: { reporterId: user.id } },
        { foundItem: { reporterId: user.id } },
      ];
    }

    const matches = await prisma.match.findMany({
      where: whereClause,
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
      orderBy: { score: 'desc' },
    });

    const formatted = matches.map((m) => {
      let parsed: any = {};
      try {
        parsed = JSON.parse(m.explanation);
      } catch {
        parsed = {};
      }

      return {
        id: m.id,
        score: m.score,
        confidence: parsed.confidenceTier || (m.score >= 70 ? 'high' : 'medium'),
        breakdown: parsed.breakdown || {},
        matchingAttrs: parsed.matchingAttributes || [],
        differingAttrs: parsed.differingAttributes || [],
        createdAt: m.createdAt.toISOString(),
        lostItem: {
          id: m.lostItem.id,
          reportNumber: m.lostItem.reportNumber,
          title: m.lostItem.name,
          category: m.lostItem.category,
          brand: m.lostItem.brand,
          color: m.lostItem.color,
          description: m.lostItem.description,
          dateIncident: m.lostItem.occurredAt.toISOString(),
          locationDescription: m.lostItem.locationBuilding,
          collegeName: m.lostItem.college.name,
          campusName: m.lostItem.campus?.name || null,
          imageUrl: m.lostItem.images[0]?.url || null,
          reporterId: m.lostItem.reporterId,
        },
        foundItem: {
          id: m.foundItem.id,
          reportNumber: m.foundItem.reportNumber,
          title: m.foundItem.name,
          category: m.foundItem.category,
          brand: m.foundItem.brand,
          color: m.foundItem.color,
          description: m.foundItem.description,
          dateIncident: m.foundItem.occurredAt.toISOString(),
          locationDescription: m.foundItem.locationBuilding,
          collegeName: m.foundItem.college.name,
          campusName: m.foundItem.campus?.name || null,
          imageUrl: m.foundItem.images[0]?.url || null,
          reporterId: m.foundItem.reporterId,
        },
      };
    });

    return NextResponse.json({ matches: formatted });
  } catch (error) {
    return errorResponse(error);
  }
}
