import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireCollegeAdmin, errorResponse, AuthError } from '@/lib/auth/tenant';
import { MembershipStatus } from '@prisma/client';
import { z } from 'zod';

const createLocationSchema = z.object({
  campusId: z.string().min(1, 'Campus ID is required'),
  name: z.string().min(2, 'Location name is required'),
  building: z.string().min(1, 'Building name is required'),
  floorLabel: z.string().optional(),
  locationType: z.string().default('building'),
  hasDesk: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const parsed = createLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { campusId, name, building, floorLabel, locationType, hasDesk } = parsed.data;

    // Verify campus exists and user has college admin rights over its college
    const campus = await prisma.campus.findUnique({
      where: { id: campusId },
      include: { college: true },
    });

    if (!campus) {
      return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
    }

    requireCollegeAdmin(user, campus.collegeId);

    const location = await prisma.$transaction(async (tx) => {
      const newLoc = await tx.campusLocation.create({
        data: {
          campusId,
          name,
          building,
          floorLabel: floorLabel || null,
          locationType,
          hasDesk,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'LOCATION_CREATED',
          actorId: user.id,
          collegeId: campus.collegeId,
          resourceType: 'CampusLocation',
          resourceId: newLoc.id,
          metadata: JSON.stringify({ name, building, campusName: campus.name }),
        },
      });

      return newLoc;
    });

    return NextResponse.json({
      success: true,
      message: 'Location created successfully',
      location,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
