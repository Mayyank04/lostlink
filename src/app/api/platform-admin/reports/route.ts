import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { ItemStatus, ItemReportType } from '@prisma/client';
import { z } from 'zod';

const updateReportSchema = z.object({
  id: z.string(),
  isArchived: z.boolean().optional(),
  status: z.nativeEnum(ItemStatus).optional(),
  actionReason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const collegeId = searchParams.get('collegeId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { reportNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (collegeId && collegeId !== 'ALL') {
      where.collegeId = collegeId;
    }
    if (type && type !== 'ALL') {
      where.type = type as ItemReportType;
    }
    if (status && status !== 'ALL') {
      where.status = status as ItemStatus;
    }

    const [total, items] = await Promise.all([
      prisma.item.count({ where }),
      prisma.item.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reportedAt: 'desc' },
        include: {
          college: { select: { id: true, name: true, slug: true } },
          campus: { select: { id: true, name: true } },
          reporter: { select: { id: true, name: true, email: true } },
          images: { take: 1, select: { id: true, url: true } },
          _count: { select: { claims: true, potentialMatchesAsLost: true, potentialMatchesAsFound: true } },
        },
      }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        total,
        page,
        limit,
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
    requirePlatformAdmin(user);

    const body = await req.json();
    const validated = updateReportSchema.parse(body);

    const item = await prisma.item.findUnique({
      where: { id: validated.id },
      include: { college: true },
    });
    if (!item) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const it = await tx.item.update({
        where: { id: validated.id },
        data: {
          isArchived: validated.isArchived !== undefined ? validated.isArchived : undefined,
          status: validated.status !== undefined ? validated.status : undefined,
        },
      });

      // Log moderation action
      await tx.moderationAction.create({
        data: {
          actorId: user.id,
          collegeId: item.collegeId,
          targetType: 'ITEM',
          targetId: item.id,
          action: validated.isArchived ? 'HIDE_REPORT' : validated.status ? 'UPDATE_STATUS' : 'MODERATE_REPORT',
          reason: validated.actionReason || 'Super Admin moderation review',
          metadata: JSON.stringify({
            previousStatus: item.status,
            newStatus: validated.status,
            isArchived: validated.isArchived,
            reportNumber: item.reportNumber,
          }),
        },
      });

      return it;
    });

    return NextResponse.json({ message: 'Report updated successfully', item: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation failed' }, { status: 400 });
    }
    return errorResponse(error);
  }
}
