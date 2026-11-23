import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { itemService } from '@/server/services/item.service';
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

    const { items, total } = await itemService.getItems({
      type: type || undefined,
      collegeId: collegeId || undefined,
      campusId: campusId || undefined,
      category: category || undefined,
      status: (statusParam as any) || undefined,
      search: search || undefined,
      skip,
      limit,
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

    const createdItem = await itemService.createReport(user, result.data);

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
