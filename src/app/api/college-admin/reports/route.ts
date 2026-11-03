import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireCollegeAdmin, errorResponse, AuthError } from '@/lib/auth/tenant';
import { ItemReportType, ItemStatus, MembershipStatus } from '@prisma/client';
import { z } from 'zod';

const updateReportSchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
  status: z.enum([
    ItemStatus.OPEN,
    ItemStatus.POTENTIAL_MATCH,
    ItemStatus.CLAIM_PENDING,
    ItemStatus.RESOLVED,
    ItemStatus.RETURNED,
    ItemStatus.CLOSED,
  ]).optional(),
  depositedWithOffice: z.boolean().optional(),
  officeLocationNotes: z.string().optional(),
  isArchived: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    let collegeId = searchParams.get('collegeId');
    if (user.role !== 'PLATFORM_ADMIN' || !collegeId) {
      const membership = user.memberships.find((m) => m.status === MembershipStatus.VERIFIED) || user.memberships[0];
      if (!membership) {
        throw new AuthError('No college association found for this administrator', 403);
      }
      collegeId = membership.collegeId;
    }

    requireCollegeAdmin(user, collegeId);

    const type = searchParams.get('type') as ItemReportType | null;
    const status = searchParams.get('status') as ItemStatus | null;
    const campusId = searchParams.get('campusId');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = { collegeId };

    if (type && Object.values(ItemReportType).includes(type)) {
      where.type = type;
    }

    if (status && Object.values(ItemStatus).includes(status)) {
      where.status = status;
    }

    if (campusId) {
      where.campusId = campusId;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { reportNumber: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { brand: { contains: term, mode: 'insensitive' } },
        { locationBuilding: { contains: term, mode: 'insensitive' } },
        { reporter: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, reports] = await Promise.all([
      prisma.item.count({ where }),
      prisma.item.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          campus: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          images: { select: { id: true, url: true, isPrimary: true } },
          claims: { select: { id: true, status: true } },
          privateEvidence: { select: { id: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      collegeId,
      reports: reports.map((r) => ({
        id: r.id,
        reportNumber: r.reportNumber,
        name: r.name,
        type: r.type,
        category: r.category,
        brand: r.brand,
        color: r.color,
        description: r.description,
        occurredAt: r.occurredAt.toISOString(),
        locationBuilding: r.locationBuilding,
        locationSpecifics: r.locationSpecifics,
        status: r.status,
        depositedWithOffice: r.depositedWithOffice,
        officeLocationNotes: r.officeLocationNotes,
        isArchived: r.isArchived,
        reporter: r.reporter,
        campus: r.campus,
        location: r.location,
        images: r.images,
        claimsCount: r.claims.length,
        hasEvidence: Boolean(r.privateEvidence),
        createdAt: r.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const parsed = updateReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { reportId, status, depositedWithOffice, officeLocationNotes, isArchived } = parsed.data;

    const report = await prisma.item.findUnique({
      where: { id: reportId },
      include: { college: true },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    requireCollegeAdmin(user, report.collegeId);

    const updated = await prisma.$transaction(async (tx) => {
      const dataToUpdate: any = {};
      if (status !== undefined) dataToUpdate.status = status;
      if (depositedWithOffice !== undefined) dataToUpdate.depositedWithOffice = depositedWithOffice;
      if (officeLocationNotes !== undefined) dataToUpdate.officeLocationNotes = officeLocationNotes;
      if (isArchived !== undefined) dataToUpdate.isArchived = isArchived;

      const updatedItem = await tx.item.update({
        where: { id: reportId },
        data: dataToUpdate,
      });

      await tx.auditLog.create({
        data: {
          action: 'REPORT_STATUS_CHANGED',
          actorId: user.id,
          collegeId: report.collegeId,
          resourceType: 'Item',
          resourceId: reportId,
          metadata: JSON.stringify({
            reportNumber: report.reportNumber,
            previousStatus: report.status,
            newStatus: status || report.status,
            isArchived,
          }),
        },
      });

      return updatedItem;
    });

    return NextResponse.json({
      success: true,
      message: 'Report updated successfully',
      report: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
