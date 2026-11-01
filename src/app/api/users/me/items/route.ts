import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ItemReportType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);

    const items = await prisma.item.findMany({
      where: { reporterId: user.id },
      include: {
        college: { select: { id: true, name: true } },
        campus: { select: { id: true, name: true } },
        images: true,
        privateEvidence: true,
        claims: {
          include: {
            claimant: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            claims: true,
            lostMatches: true,
            foundMatches: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = items.map((item) => ({
      id: item.id,
      reportNumber: item.reportNumber,
      type: item.type,
      title: item.name,
      category: item.category,
      brand: item.brand,
      color: item.color,
      description: item.description,
      status: item.status,
      dateIncident: item.occurredAt.toISOString(),
      locationDescription: item.locationBuilding,
      collegeId: item.collegeId,
      collegeName: item.college.name,
      campusName: item.campus?.name || null,
      primaryImage: item.images[0]?.url || null,
      images: item.images.map((img) => img.url),
      hasPrivateEvidence: Boolean(item.privateEvidence),
      claimsCount: item._count.claims,
      matchesCount: item.type === ItemReportType.LOST ? item._count.lostMatches : item._count.foundMatches,
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json({ items: formatted });
  } catch (error) {
    return errorResponse(error);
  }
}
