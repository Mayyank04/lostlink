import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireCollegeAdmin, errorResponse, AuthError } from '@/lib/auth/tenant';
import { MembershipStatus } from '@prisma/client';
import { z } from 'zod';

const createCampusSchema = z.object({
  collegeId: z.string().optional(),
  name: z.string().min(2, 'Campus name must be at least 2 characters'),
  code: z.string().min(2).max(20).transform((c) => c.toUpperCase().replace(/\s+/g, '-')),
  addressLabel: z.string().min(3, 'Address label is required'),
  lostFoundDeskRoom: z.string().optional(),
  operatingHours: z.string().optional(),
  contactEmail: z.string().email().optional(),
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

    const campuses = await prisma.campus.findMany({
      where: { collegeId },
      include: {
        locations: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      collegeId,
      campuses,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const parsed = createCampusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    let collegeId = parsed.data.collegeId;
    if (user.role !== 'PLATFORM_ADMIN' || !collegeId) {
      const membership = user.memberships.find((m) => m.status === MembershipStatus.VERIFIED) || user.memberships[0];
      if (!membership) {
        throw new AuthError('No college association found for this administrator', 403);
      }
      collegeId = membership.collegeId;
    }

    requireCollegeAdmin(user, collegeId);

    const existingCode = await prisma.campus.findUnique({
      where: {
        collegeId_code: {
          collegeId,
          code: parsed.data.code,
        },
      },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: `Campus code "${parsed.data.code}" already exists for this college` },
        { status: 409 }
      );
    }

    const campus = await prisma.$transaction(async (tx) => {
      const newCampus = await tx.campus.create({
        data: {
          collegeId,
          name: parsed.data.name,
          code: parsed.data.code,
          addressLabel: parsed.data.addressLabel,
          lostFoundDeskRoom: parsed.data.lostFoundDeskRoom || 'Main Security / Desk',
          operatingHours: parsed.data.operatingHours || 'Mon - Fri: 8:00 AM - 6:00 PM',
          contactEmail: parsed.data.contactEmail || user.email,
        },
      });

      // Automatically create a default main location for this new campus
      await tx.campusLocation.create({
        data: {
          campusId: newCampus.id,
          name: 'Main Desk / Office',
          building: 'Main Hall',
          locationType: 'desk',
          hasDesk: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CAMPUS_CREATED',
          actorId: user.id,
          collegeId,
          resourceType: 'Campus',
          resourceId: newCampus.id,
          metadata: JSON.stringify({ name: newCampus.name, code: newCampus.code }),
        },
      });

      return newCampus;
    });

    return NextResponse.json({
      success: true,
      message: 'Campus created successfully with default location',
      campus,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
