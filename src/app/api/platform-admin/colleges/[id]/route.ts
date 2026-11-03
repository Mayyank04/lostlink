import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { CollegeStatus, UserRole } from '@prisma/client';
import { z } from 'zod';

const updateCollegeSchema = z.object({
  name: z.string().min(3).optional(),
  shortName: z.string().optional().nullable(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  institutionType: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  emailDomains: z.array(z.string().min(3)).min(1).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  country: z.string().optional(),
  address: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional().nullable(),
  reviewNotes: z.string().optional().nullable(),
  status: z.nativeEnum(CollegeStatus).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const college = await prisma.college.findUnique({
      where: { id: params.id },
      include: {
        campuses: {
          include: {
            locations: true,
            _count: { select: { items: true } },
          },
        },
        memberships: {
          where: { user: { role: { in: [UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_MODERATOR] } } },
          include: {
            user: { select: { id: true, name: true, email: true, role: true, status: true, phone: true } },
          },
        },
        adminInvitations: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            memberships: true,
            items: true,
            matchingJobs: true,
            campusWorkerKeys: true,
          },
        },
      },
    });

    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    return NextResponse.json({ college });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const body = await req.json();
    const validated = updateCollegeSchema.parse(body);

    const existing = await prisma.college.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    // Check slug uniqueness if changed
    if (validated.slug && validated.slug !== existing.slug) {
      const slugConflict = await prisma.college.findUnique({
        where: { slug: validated.slug },
      });
      if (slugConflict) {
        return NextResponse.json({ error: `Slug "${validated.slug}" is already in use.` }, { status: 409 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const col = await tx.college.update({
        where: { id: params.id },
        data: {
          name: validated.name?.trim(),
          shortName: validated.shortName !== undefined ? (validated.shortName?.trim() || null) : undefined,
          slug: validated.slug?.trim().toLowerCase(),
          institutionType: validated.institutionType,
          website: validated.website !== undefined ? validated.website || null : undefined,
          emailDomains: validated.emailDomains?.map((d) => d.trim().toLowerCase().replace(/^@/, '')),
          city: validated.city?.trim(),
          state: validated.state?.trim(),
          country: validated.country?.trim(),
          address: validated.address !== undefined ? validated.address : undefined,
          logoUrl: validated.logoUrl !== undefined ? validated.logoUrl : undefined,
          primaryColor: validated.primaryColor,
          contactEmail: validated.contactEmail !== undefined ? validated.contactEmail || null : undefined,
          contactPhone: validated.contactPhone !== undefined ? validated.contactPhone : undefined,
          reviewNotes: validated.reviewNotes !== undefined ? validated.reviewNotes : undefined,
          status: validated.status,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: col.id,
          action: 'UPDATE_COLLEGE',
          resourceType: 'COLLEGE',
          resourceId: col.id,
          metadata: JSON.stringify({
            changes: validated,
            updatedBy: user.email,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return col;
    });

    return NextResponse.json({ message: 'College updated successfully', college: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation failed' }, { status: 400 });
    }
    return errorResponse(error);
  }
}
