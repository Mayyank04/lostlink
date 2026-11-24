import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';

export const dynamic = 'force-dynamic';

const studentOnboardingSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').trim(),
  studentIdNumber: z.string().min(2, 'Student ID / Enrollment number is required').trim(),
  course: z.string().min(2, 'Course / Program is required').trim(),
  department: z.string().min(2, 'Department is required').trim(),
  batch: z.string().min(4, 'Batch is required (e.g. 2023-2027)').trim(),
  admissionYear: z.coerce.number().int().min(2000).max(2035, 'Invalid admission year'),
  currentYear: z.coerce.number().int().min(1).max(6, 'Academic year must be between 1 and 6'),
  section: z.string().trim().optional().nullable(),
  semester: z.coerce.number().int().min(1).max(12).optional().nullable(),
  phoneNumber: z.string().trim().optional().nullable(),
  avatarUrl: z.string().trim().optional().nullable(),
});

/**
 * GET /api/onboarding/student - Fetch authenticated student onboarding context & verified college
 */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Onboarding is exclusively for students' }, { status: 403 });
    }

    const verifiedMembership = user.memberships.find((m) => m.status === 'VERIFIED');
    if (!verifiedMembership || !user.emailVerified) {
      return NextResponse.json(
        { error: 'Institutional college membership and email must be verified via OTP before accessing onboarding.' },
        { status: 403 }
      );
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      student: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        college: {
          id: verifiedMembership.college.id,
          name: verifiedMembership.college.name,
          slug: verifiedMembership.college.slug,
          logoUrl: verifiedMembership.college.logoUrl,
          city: verifiedMembership.college.city,
          state: verifiedMembership.college.state,
        },
        profile: profile || null,
        isOnboarded: Boolean(user.isOnboarded || profile?.isOnboardingDone),
      },
    });
  } catch (error) {
    console.error('Error fetching student onboarding status:', error);
    return NextResponse.json({ error: 'Failed to retrieve onboarding context' }, { status: 500 });
  }
}

/**
 * POST /api/onboarding/student - Complete first-time student academic onboarding
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`onboarding:${ip}`, 10, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Onboarding is exclusively for students' }, { status: 403 });
    }

    const verifiedMembership = user.memberships.find((m) => m.status === 'VERIFIED');
    if (!verifiedMembership || !user.emailVerified) {
      return NextResponse.json(
        { error: 'Institutional college membership and email must be verified via OTP before completing onboarding.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = studentOnboardingSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid academic information' },
        { status: 400 }
      );
    }

    const {
      name,
      studentIdNumber,
      course,
      department,
      batch,
      admissionYear,
      currentYear,
      section,
      semester,
      phoneNumber,
      avatarUrl,
    } = parseResult.data;

    // Execute atomic update of academic profile and user record
    await prisma.$transaction(async (tx) => {
      // 1. Upsert StudentProfile
      await tx.studentProfile.upsert({
        where: { userId: user.id },
        update: {
          studentIdNumber,
          course,
          department,
          batch,
          admissionYear,
          currentYear,
          section: section || null,
          semester: semester || null,
          phoneNumber: phoneNumber || null,
          avatarUrl: avatarUrl || null,
          isOnboardingDone: true,
          completedAt: new Date(),
        },
        create: {
          userId: user.id,
          studentIdNumber,
          course,
          department,
          batch,
          admissionYear,
          currentYear,
          section: section || null,
          semester: semester || null,
          phoneNumber: phoneNumber || null,
          avatarUrl: avatarUrl || null,
          isOnboardingDone: true,
          completedAt: new Date(),
        },
      });

      // 2. Update User profile traits
      await tx.user.update({
        where: { id: user.id },
        data: {
          name,
          phone: phoneNumber || user.phone,
          department,
          gradYear: admissionYear + 4,
          image: avatarUrl || user.image,
          isOnboarded: true,
        },
      });

      // 3. Update Membership student identifier
      await tx.collegeMembership.update({
        where: { id: verifiedMembership.id },
        data: {
          studentIdentifier: studentIdNumber,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: verifiedMembership.collegeId,
          action: 'STUDENT_ONBOARDING_COMPLETED',
          resourceType: 'STUDENT_PROFILE',
          resourceId: user.id,
          metadata: JSON.stringify({
            course,
            department,
            batch,
            admissionYear,
            currentYear,
            studentIdNumber,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    });

    const targetRedirect = verifiedMembership.college.slug
      ? `/campus/${verifiedMembership.college.slug}/dashboard`
      : '/dashboard';

    return NextResponse.json({
      success: true,
      message: 'Academic profile completed successfully. Welcome to your campus dashboard!',
      redirectTo: targetRedirect,
    });
  } catch (error) {
    console.error('Error completing student onboarding:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while completing onboarding.' },
      { status: 500 }
    );
  }
}
