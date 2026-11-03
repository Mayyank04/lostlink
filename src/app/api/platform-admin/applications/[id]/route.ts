import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { CollegeStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reviewNotes: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const body = await req.json();
    const validated = reviewSchema.parse(body);

    const application = await prisma.collegeApplication.findUnique({
      where: { id: params.id },
    });
    if (!application) {
      return NextResponse.json({ error: 'College application not found' }, { status: 404 });
    }

    if (validated.action === 'REJECT') {
      const updated = await prisma.collegeApplication.update({
        where: { id: params.id },
        data: {
          status: 'REJECTED',
          reviewNotes: validated.reviewNotes || null,
          reviewedBy: user.email,
          reviewedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'REJECT_COLLEGE_APPLICATION',
          resourceType: 'COLLEGE_APPLICATION',
          resourceId: application.id,
          metadata: JSON.stringify({ slug: application.slug, reviewer: user.email }),
        },
      });

      return NextResponse.json({ message: 'College application rejected', application: updated });
    }

    // Action is APPROVE -> Provision College in PostgreSQL
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create College
      const college = await tx.college.create({
        data: {
          name: application.collegeName,
          slug: application.slug,
          institutionType: application.institutionType,
          website: application.website,
          emailDomains: application.emailDomains,
          country: application.country,
          state: application.state,
          city: application.city,
          address: application.address,
          contactEmail: application.contactEmail,
          contactPhone: application.contactPhone,
          status: CollegeStatus.ACTIVE,
          reviewNotes: validated.reviewNotes || `Approved from application by ${application.applicantName}`,
        },
      });

      // 2. Create Campus
      const campus = await tx.campus.create({
        data: {
          collegeId: college.id,
          name: application.initialCampus,
          code: 'MAIN',
          addressLabel: `${application.collegeName} - ${application.initialCampus}`,
          lostFoundDeskRoom: 'Central Lost & Found Desk',
          operatingHours: 'Mon - Fri: 8:00 AM - 5:00 PM',
          contactEmail: application.contactEmail || `contact@${application.emailDomains[0]}`,
        },
      });

      // 3. Create Campus Location
      await tx.campusLocation.create({
        data: {
          campusId: campus.id,
          name: 'Main Security / Information Desk',
          building: 'Administration Building',
          hasDesk: true,
          active: true,
        },
      });

      // 4. Invite applicant as College Admin
      const token = `inv_${crypto.randomBytes(24).toString('hex')}`;
      const invitation = await tx.collegeAdminInvitation.create({
        data: {
          collegeId: college.id,
          email: application.applicantEmail,
          token,
          role: UserRole.COLLEGE_ADMIN,
          invitedBy: user.email,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      // 5. Update Application status
      const updatedApp = await tx.collegeApplication.update({
        where: { id: params.id },
        data: {
          status: 'APPROVED',
          reviewNotes: validated.reviewNotes || null,
          reviewedBy: user.email,
          reviewedAt: new Date(),
        },
      });

      // 6. Audit log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: college.id,
          action: 'APPROVE_COLLEGE_APPLICATION',
          resourceType: 'COLLEGE_APPLICATION',
          resourceId: application.id,
          metadata: JSON.stringify({
            collegeId: college.id,
            slug: college.slug,
            applicantEmail: application.applicantEmail,
          }),
        },
      });

      return { college, campus, invitation, application: updatedApp };
    });

    return NextResponse.json({
      message: `College "${result.college.name}" approved and provisioned successfully!`,
      college: result.college,
      invitation: result.invitation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation failed' }, { status: 400 });
    }
    return errorResponse(error);
  }
}
