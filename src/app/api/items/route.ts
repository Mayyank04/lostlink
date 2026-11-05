import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { requireAuth, requireCollegeMembership, errorResponse } from '@/lib/auth/tenant';
import { triggerMatchingEngineForItem } from '@/lib/matching/matchEngine';
import { enqueueMatchingJob } from '@/lib/hybrid/queue';
import { encryptEvidence } from '@/lib/crypto/evidenceEncryption';
import { ItemReportType, ItemStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const createItemSchema = z.object({
  type: z.enum(['LOST', 'FOUND']),
  title: z.string().min(2, 'Item title is required'),
  category: z.string().min(2, 'Category is required'),
  brand: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  dateIncident: z.string().min(4, 'Incident date is required'),
  timeIncident: z.string().optional().nullable(),
  collegeId: z.string().min(1, 'College selection is required'),
  campusId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  locationDescription: z.string().min(2, 'Location details required'),
  isPublic: z.boolean().default(true),
  depositedWithOffice: z.boolean().default(false),
  images: z
    .array(
      z.object({
        url: z.string(),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
  privateEvidence: z
    .array(
      z.object({
        evidenceType: z.string(),
        description: z.string().optional().nullable(),
        fileUrl: z.string().optional().nullable(),
      })
    )
    .optional(),
});

/**
 * GET /api/items - Search and browse lost and found items
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const type = searchParams.get('type') as ItemReportType | null;
    const collegeId = searchParams.get('collegeId');
    const campusId = searchParams.get('campusId');
    const category = searchParams.get('category');
    const statusParam = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      isArchived: false,
    };

    if (type) whereClause.type = type;
    if (collegeId) whereClause.collegeId = collegeId;
    if (campusId) whereClause.campusId = campusId;
    if (category && category !== 'All' && category !== 'all') whereClause.category = category;
    if (statusParam && statusParam !== 'ALL') {
      whereClause.status = statusParam as ItemStatus;
    } else if (!statusParam) {
      whereClause.status = { not: ItemStatus.CLOSED };
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
        { locationBuilding: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.item.count({ where: whereClause }),
      prisma.item.findMany({
        where: whereClause,
        include: {
          college: { select: { id: true, name: true, slug: true } },
          campus: { select: { id: true, name: true, code: true } },
          reporter: { select: { id: true, name: true } },
          images: { select: { id: true, url: true, visibility: true } },
          _count: { select: { claims: true, lostMatches: true, foundMatches: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formatted = items.map((item) => ({
      id: item.id,
      reportNumber: item.reportNumber,
      type: item.type,
      title: item.name,
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
      campusId: item.campusId,
      campusName: item.campus?.name || null,
      reporterId: item.reporterId,
      reporterName: item.reporter.name,
      primaryImage: item.images[0]?.url || null,
      images: item.images.map((img) => img.url),
      claimsCount: item._count.claims,
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

/**
 * POST /api/items - Create a new Lost or Found item report
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const result = createItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid item data' },
        { status: 400 }
      );
    }

    const data = result.data;

    requireCollegeMembership(user, data.collegeId);

    // Fallback campus if not provided
    let campusId = data.campusId;
    if (!campusId) {
      const defaultCampus = await prisma.campus.findFirst({
        where: { collegeId: data.collegeId },
      });
      campusId = defaultCampus?.id || '';
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = data.type === 'LOST' ? 'LL' : 'FD';
    const reportNumber = `${prefix}-${new Date().getFullYear()}-${randomSuffix}`;

    const createdItem = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          reportNumber,
          type: data.type === 'LOST' ? ItemReportType.LOST : ItemReportType.FOUND,
          name: data.title,
          category: data.category,
          brand: data.brand || null,
          color: data.color || 'Unspecified',
          description: data.description,
          occurredAt: new Date(data.dateIncident),
          collegeId: data.collegeId,
          campusId: campusId!,
          locationId: data.locationId || null,
          locationBuilding: data.locationDescription,
          depositedWithOffice: data.depositedWithOffice,
          reporterId: user.id,
          status: ItemStatus.OPEN,
        },
      });

      if (data.images && data.images.length > 0) {
        await tx.itemImage.createMany({
          data: data.images.map((img, idx) => ({
            itemId: item.id,
            objectKey: `uploads/${item.id}-${idx}`,
            url: img.url,
            visibility: 'PUBLIC',
          })),
        });
      }

      if (data.privateEvidence && data.privateEvidence.length > 0) {
        await tx.privateItemEvidence.create({
          data: {
            itemId: item.id,
            encryptedEvidence: encryptEvidence(data.privateEvidence),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: data.collegeId,
          action: 'CREATE_REPORT',
          resourceType: 'ITEM',
          resourceId: item.id,
          metadata: JSON.stringify({
            reportNumber,
            type: data.type,
            hasEvidence: (data.privateEvidence?.length || 0) > 0,
          }),
        },
      });

      return item;
    });

    triggerMatchingEngineForItem(createdItem.id).catch((err) =>
      console.error('Match engine execution failed:', err)
    );

    enqueueMatchingJob(createdItem.id).catch((err) =>
      console.error('[HybridQueue] Failed to enqueue matching job:', err)
    );

    return NextResponse.json(
      {
        message: 'Item report submitted successfully',
        item: {
          id: createdItem.id,
          reportNumber: createdItem.reportNumber,
          type: createdItem.type,
          title: createdItem.name,
          status: createdItem.status,
          createdAt: createdItem.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
