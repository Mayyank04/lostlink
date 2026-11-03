import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSlug } from '@/lib/utils/slug';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const domainRegex = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)+$/i;

const requestCollegeSchema = z.object({
  collegeName: z.string().trim().min(3, 'College name must be at least 3 characters'),
  shortName: z.string().trim().optional().nullable(),
  country: z.string().trim().min(2, 'Country is required'),
  state: z.string().trim().min(1, 'State or region is required'),
  city: z.string().trim().min(2, 'City is required'),
  website: z.string().trim().url('Invalid website URL format').optional().or(z.literal('')),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .refine((val) => !val.includes('@'), { message: 'Must be a domain (e.g. iilm.edu), not an email address' })
    .optional()
    .or(z.literal('')),
  contactEmail: z.string().trim().email('Invalid contact email format').optional().or(z.literal('')),
  applicantName: z.string().trim().min(2, 'Your name is required'),
  applicantEmail: z.string().trim().email('Your official or academic email address is required'),
  notes: z.string().trim().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = requestCollegeSchema.parse(body);

    const slug = generateSlug(validated.shortName || validated.collegeName);
    if (!slug || slug.length < 2) {
      return NextResponse.json(
        { error: 'Could not generate a valid identifier for this college name.' },
        { status: 400 }
      );
    }

    // 1. Check if college already exists
    const existingCollege = await prisma.college.findUnique({
      where: { slug },
      select: { id: true, name: true, city: true, state: true, country: true },
    });
    if (existingCollege) {
      return NextResponse.json(
        {
          error: `This institution is already active as "${existingCollege.name}" in ${existingCollege.city}, ${existingCollege.state}. You can select it directly from the directory.`,
          existingCollegeId: existingCollege.id,
        },
        { status: 409 }
      );
    }

    // 2. Check if a pending request for this slug already exists
    const existingPending = await prisma.collegeApplication.findFirst({
      where: {
        slug,
        status: 'PENDING',
      },
    });
    if (existingPending) {
      return NextResponse.json(
        {
          message: `A request for "${validated.collegeName}" is already under review by platform administrators.`,
          applicationId: existingPending.id,
          alreadyPending: true,
        },
        { status: 200 }
      );
    }

    // 3. Prepare email domains array
    let emailDomains: string[] = [];
    if (validated.domain) {
      emailDomains.push(validated.domain.replace(/^@/, '').toLowerCase());
    } else if (validated.applicantEmail.includes('@')) {
      const extractedDomain = validated.applicantEmail.split('@')[1].toLowerCase();
      if (!['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(extractedDomain)) {
        emailDomains.push(extractedDomain);
      }
    }

    // 4. Create application in PostgreSQL
    const application = await prisma.collegeApplication.create({
      data: {
        collegeName: validated.collegeName.trim(),
        slug,
        institutionType: 'University',
        website: validated.website || null,
        emailDomains,
        country: validated.country.trim(),
        state: validated.state.trim(),
        city: validated.city.trim(),
        contactEmail: validated.contactEmail || null,
        initialCampus: 'Main Campus',
        applicantName: validated.applicantName.trim(),
        applicantEmail: validated.applicantEmail.trim().toLowerCase(),
        applicantRole: 'Student Requester',
        notes: validated.notes ? `[Student Request] ${validated.notes}` : '[Student Request via College Finder]',
        status: 'PENDING',
      },
    });

    // 5. Create immutable audit log
    await prisma.auditLog.create({
      data: {
        action: 'SUBMIT_COLLEGE_REQUEST',
        resourceType: 'COLLEGE_APPLICATION',
        resourceId: application.id,
        metadata: JSON.stringify({
          collegeName: application.collegeName,
          slug: application.slug,
          applicantEmail: application.applicantEmail,
          city: application.city,
          state: application.state,
          country: application.country,
          timestamp: new Date().toISOString(),
        }),
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        message: `Your request to add "${validated.collegeName}" has been submitted to platform administrators for verification.`,
        application: {
          id: application.id,
          collegeName: application.collegeName,
          slug: application.slug,
          status: application.status,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error submitting college request:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while submitting your college request.' },
      { status: 500 }
    );
  }
}
