import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { CollegeStatus, UserRole, MembershipStatus } from '@prisma/client';
import { z } from 'zod';

const createCollegeSchema = z.object({
  name: z.string().min(3, 'College name must be at least 3 characters'),
  shortName: z.string().optional().nullable(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens'),
  institutionType: z.string().default('University'),
  website: z.string().url('Valid website URL required').optional().or(z.literal('')),
  emailDomains: z.array(z.string().min(3)).min(1, 'At least one institutional email domain is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State/Province is required'),
  country: z.string().default('United States'),
  address: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color').default('#0F766E'),
  contactEmail: z.string().email('Valid contact email required').optional().or(z.literal('')),
  contactPhone: z.string().optional().nullable(),
  initialCampus: z
    .union([
      z.string(),
      z.object({
        name: z.string().optional(),
        code: z.string().optional(),
        addressLabel: z.string().optional(),
        initialLocationName: z.string().optional(),
      }),
    ])
    .optional()
    .default('Main Campus'),
  status: z.nativeEnum(CollegeStatus).default(CollegeStatus.ACTIVE),
  adminEmail: z.string().email().optional().or(z.literal('')),
  collegeAdmin: z
    .object({
      email: z.string().email(),
      name: z.string().optional(),
    })
    .optional(),
  reviewNotes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const where: any = { isArchived: false };
    if (status && status !== 'ALL') {
      where.status = status as CollegeStatus;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, colleges] = await Promise.all([
      prisma.college.count({ where }),
      prisma.college.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              campuses: true,
              memberships: true,
              items: true,
            },
          },
          campuses: {
            take: 3,
            select: { id: true, name: true, code: true },
          },
          memberships: {
            where: { user: { role: { in: [UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_MODERATOR] } } },
            take: 5,
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true, status: true },
              },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      colleges,
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

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const body = await req.json();
    const validated = createCollegeSchema.parse(body);

    // Normalize slug and domains
    const slug = validated.slug.trim().toLowerCase();
    const emailDomains = validated.emailDomains.map((d) => d.trim().toLowerCase().replace(/^@/, ''));

    // Check slug uniqueness
    const existing = await prisma.college.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A college with slug "${slug}" already exists. Please choose a unique identifier.` },
        { status: 409 }
      );
    }

    // Atomic transaction creating college, campus, location, and optional admin
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create College
      const college = await tx.college.create({
        data: {
          name: validated.name.trim(),
          shortName: validated.shortName?.trim() || null,
          slug,
          institutionType: validated.institutionType,
          website: validated.website || null,
          emailDomains,
          city: validated.city.trim(),
          state: validated.state.trim(),
          country: validated.country.trim(),
          address: validated.address || null,
          logoUrl: validated.logoUrl || null,
          primaryColor: validated.primaryColor,
          contactEmail: validated.contactEmail || null,
          contactPhone: validated.contactPhone || null,
          status: validated.status,
          reviewNotes: validated.reviewNotes || null,
        },
      });

      // 2. Create Initial Campus
      const initialCampusObj = typeof validated.initialCampus === 'object' ? validated.initialCampus : null;
      const campusName = initialCampusObj?.name || (typeof validated.initialCampus === 'string' ? validated.initialCampus : 'Main Campus');
      const campusCode = initialCampusObj?.code || 'MAIN';
      const addressLabel = initialCampusObj?.addressLabel || `${validated.name} - ${campusName}`;
      const locationName = initialCampusObj?.initialLocationName || 'Main Security Office & Lost/Found Desk';

      const campus = await tx.campus.create({
        data: {
          collegeId: college.id,
          name: campusName.trim(),
          code: campusCode.trim().toUpperCase(),
          addressLabel: addressLabel.trim(),
          lostFoundDeskRoom: 'Central Security / Information Desk',
          operatingHours: 'Mon - Fri: 8:00 AM - 5:00 PM',
          contactEmail: validated.contactEmail || `lostfound@${emailDomains[0]}`,
          status: 'ACTIVE',
        },
      });

      // 3. Create Initial Primary Campus Location
      await tx.campusLocation.create({
        data: {
          campusId: campus.id,
          name: locationName.trim(),
          building: 'Administration Hall',
          floorLabel: 'Ground Floor',
          locationType: 'desk',
          hasDesk: true,
          active: true,
        },
      });

      // 4. Assign College Admin if provided
      let assignedAdmin = null;
      const targetAdminEmail = validated.adminEmail || validated.collegeAdmin?.email;
      if (targetAdminEmail) {
        const adminEmail = targetAdminEmail.trim().toLowerCase();
        let targetUser = await tx.user.findUnique({
          where: { email: adminEmail },
        });

        if (targetUser) {
          // Update user role to COLLEGE_ADMIN if currently STUDENT
          if (targetUser.role === UserRole.STUDENT) {
            targetUser = await tx.user.update({
              where: { id: targetUser.id },
              data: { role: UserRole.COLLEGE_ADMIN },
            });
          }

          // Upsert college membership
          await tx.collegeMembership.upsert({
            where: { userId_collegeId: { userId: targetUser.id, collegeId: college.id } },
            update: { status: MembershipStatus.VERIFIED, verifiedBy: user.email },
            create: {
              userId: targetUser.id,
              collegeId: college.id,
              status: MembershipStatus.VERIFIED,
              verifiedBy: user.email,
              verificationMethod: 'SUPER_ADMIN_ASSIGNMENT',
            },
          });

          assignedAdmin = { id: targetUser.id, email: targetUser.email, name: targetUser.name };
        } else {
          // Create admin invitation
          const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
          await tx.collegeAdminInvitation.create({
            data: {
              collegeId: college.id,
              email: adminEmail,
              token,
              role: UserRole.COLLEGE_ADMIN,
              invitedBy: user.email,
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            },
          });
        }
      }

      // 5. Create Audit Log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: college.id,
          action: 'CREATE_COLLEGE',
          resourceType: 'COLLEGE',
          resourceId: college.id,
          metadata: JSON.stringify({
            collegeName: college.name,
            slug: college.slug,
            emailDomains: college.emailDomains,
            initialCampus: campus.name,
            assignedAdmin,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return { college, campus, assignedAdmin };
    });

    return NextResponse.json(
      {
        message: `College "${result.college.name}" created successfully`,
        college: result.college,
        campus: result.campus,
        assignedAdmin: result.assignedAdmin,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation failed', details: error.issues }, { status: 400 });
    }
    return errorResponse(error);
  }
}
