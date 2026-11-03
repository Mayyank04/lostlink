import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { z } from 'zod';

const applicationSchema = z.object({
  collegeName: z.string().min(3),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/),
  institutionType: z.string().default('University'),
  website: z.string().url().optional().or(z.literal('')),
  emailDomains: z.array(z.string().min(3)).min(1),
  country: z.string().default('United States'),
  state: z.string().min(2),
  city: z.string().min(2),
  address: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional().nullable(),
  initialCampus: z.string().default('Main Campus'),
  applicantName: z.string().min(2),
  applicantEmail: z.string().email(),
  applicantRole: z.string().min(2),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const applications = await prisma.collegeApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = applicationSchema.parse(body);

    const slug = validated.slug.trim().toLowerCase();
    const emailDomains = validated.emailDomains.map((d) => d.trim().toLowerCase().replace(/^@/, ''));

    // Check if college or application slug already exists
    const existingCollege = await prisma.college.findUnique({ where: { slug } });
    if (existingCollege) {
      return NextResponse.json({ error: `An institution with slug "${slug}" already exists.` }, { status: 409 });
    }

    const application = await prisma.collegeApplication.create({
      data: {
        collegeName: validated.collegeName.trim(),
        slug,
        institutionType: validated.institutionType,
        website: validated.website || null,
        emailDomains,
        country: validated.country.trim(),
        state: validated.state.trim(),
        city: validated.city.trim(),
        address: validated.address || null,
        contactEmail: validated.contactEmail || null,
        contactPhone: validated.contactPhone || null,
        initialCampus: validated.initialCampus.trim(),
        applicantName: validated.applicantName.trim(),
        applicantEmail: validated.applicantEmail.trim().toLowerCase(),
        applicantRole: validated.applicantRole.trim(),
        notes: validated.notes || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      {
        message: 'College application submitted successfully. It will be reviewed by the platform administrator.',
        application,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation failed' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to submit college application' }, { status: 500 });
  }
}
