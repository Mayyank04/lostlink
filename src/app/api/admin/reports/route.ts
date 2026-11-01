import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const collegeId = searchParams.get('collegeId') || user.memberships[0]?.collegeId;

    const isPlatformAdmin = user.role === UserRole.PLATFORM_ADMIN;
    const isCollegeAdmin = user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR;

    if (!isPlatformAdmin && !isCollegeAdmin) {
      return NextResponse.json(
        { error: 'Administrative privileges required' },
        { status: 403 }
      );
    }

    const items = await prisma.item.findMany({
      where: {
        ...(collegeId && collegeId !== 'all' ? { collegeId } : {}),
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        college: { select: { id: true, name: true } },
        campus: { select: { id: true, name: true } },
        images: true,
        claims: true,
        privateEvidence: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      reports: items.map((item) => ({
        id: item.id,
        reportNumber: item.reportNumber,
        title: item.name,
        type: item.type,
        category: item.category,
        brand: item.brand,
        color: item.color,
        description: item.description,
        dateIncident: item.occurredAt.toISOString(),
        locationDescription: item.locationBuilding,
        status: item.status,
        depositedWithOffice: item.depositedWithOffice,
        collegeId: item.collegeId,
        collegeName: item.college.name,
        campusName: item.campus?.name || null,
        reporterId: item.reporterId,
        reporterName: item.reporter.name,
        reporterEmail: item.reporter.email,
        images: item.images.map((img) => img.url),
        claimsCount: item.claims.length,
        hasEvidence: Boolean(item.privateEvidence),
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
