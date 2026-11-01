import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user = await getCurrentUser(req);
    const requestedCollegeId = searchParams.get('collegeId');

    const collegeId =
      requestedCollegeId ||
      user?.memberships[0]?.collegeId ||
      undefined;

    const recentItems = await prisma.item.findMany({
      where: collegeId ? { collegeId } : {},
      include: {
        college: { select: { id: true, name: true } },
        campus: { select: { id: true, name: true } },
        images: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    let matches: any[] = [];
    if (user) {
      matches = await prisma.match.findMany({
        where: {
          status: { not: 'DISMISSED' },
          OR: [
            { lostItem: { reporterId: user.id } },
            { foundItem: { reporterId: user.id } },
          ],
        },
        include: {
          lostItem: {
            include: { images: true, college: true },
          },
          foundItem: {
            include: { images: true, college: true },
          },
        },
        orderBy: { score: 'desc' },
        take: 4,
      });
    }

    return NextResponse.json({
      recentItems: recentItems.map((item) => ({
        id: item.id,
        reportNumber: item.reportNumber,
        title: item.name,
        type: item.type,
        category: item.category,
        locationDescription: item.locationBuilding,
        status: item.status,
        dateIncident: item.occurredAt.toISOString(),
        collegeName: item.college.name,
        campusName: item.campus?.name || null,
        imageUrl: item.images[0]?.url || null,
        createdAt: item.createdAt.toISOString(),
      })),
      suggestedMatches: matches.map((m) => {
        let parsedBreakdown: any = null;
        try {
          parsedBreakdown = JSON.parse(m.explanation);
        } catch {
          parsedBreakdown = {};
        }

        return {
          id: m.id,
          score: m.score,
          confidence: parsedBreakdown?.confidenceTier || (m.score >= 70 ? 'high' : 'medium'),
          lostItem: {
            id: m.lostItem.id,
            title: m.lostItem.name,
            category: m.lostItem.category,
            imageUrl: m.lostItem.images[0]?.url || null,
          },
          foundItem: {
            id: m.foundItem.id,
            title: m.foundItem.name,
            category: m.foundItem.category,
            imageUrl: m.foundItem.images[0]?.url || null,
          },
          breakdown: parsedBreakdown?.breakdown || {},
          matchingAttrs: parsedBreakdown?.matchingAttributes || [],
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching dashboard activity:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard activity' }, { status: 500 });
  }
}
