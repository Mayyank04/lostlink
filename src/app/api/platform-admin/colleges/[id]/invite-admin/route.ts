import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { UserRole, MembershipStatus } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';

const inviteSchema = z.object({
  email: z.string().email('Valid institutional email required'),
  role: z.enum([UserRole.COLLEGE_ADMIN, UserRole.COLLEGE_MODERATOR]).default(UserRole.COLLEGE_ADMIN),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const body = await req.json();
    const validated = inviteSchema.parse(body);
    const targetEmail = validated.email.trim().toLowerCase();

    const college = await prisma.college.findUnique({
      where: { id: params.id },
    });
    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: targetEmail },
      });

      if (existingUser) {
        // Promote user
        const updatedUser = await tx.user.update({
          where: { id: existingUser.id },
          data: { role: validated.role },
        });

        // Add verified college membership
        await tx.collegeMembership.upsert({
          where: {
            userId_collegeId: { userId: existingUser.id, collegeId: college.id },
          },
          update: { status: MembershipStatus.VERIFIED, verifiedBy: user.email },
          create: {
            userId: existingUser.id,
            collegeId: college.id,
            status: MembershipStatus.VERIFIED,
            verifiedBy: user.email,
            verificationMethod: 'PLATFORM_ADMIN_ASSIGNMENT',
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            collegeId: college.id,
            action: 'ASSIGN_COLLEGE_ADMIN',
            resourceType: 'USER',
            resourceId: existingUser.id,
            metadata: JSON.stringify({
              targetEmail,
              assignedRole: validated.role,
              collegeSlug: college.slug,
              assignedBy: user.email,
            }),
          },
        });

        return {
          status: 'ASSIGNED',
          message: `User ${existingUser.name} (${existingUser.email}) promoted to ${validated.role} for ${college.name}`,
          user: updatedUser,
        };
      } else {
        // Generate secure 32-byte invitation token
        const token = `inv_${crypto.randomBytes(24).toString('hex')}`;
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

        const invitation = await tx.collegeAdminInvitation.create({
          data: {
            collegeId: college.id,
            email: targetEmail,
            token,
            role: validated.role,
            invitedBy: user.email,
            status: 'PENDING',
            expiresAt,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            collegeId: college.id,
            action: 'INVITE_COLLEGE_ADMIN',
            resourceType: 'COLLEGE_INVITATION',
            resourceId: invitation.id,
            metadata: JSON.stringify({
              targetEmail,
              invitedRole: validated.role,
              collegeSlug: college.slug,
              expiresAt: expiresAt.toISOString(),
            }),
          },
        });

        return {
          status: 'INVITED',
          message: `Invitation issued for ${targetEmail}. Token created and active for 14 days.`,
          invitation,
        };
      }
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation failed' }, { status: 400 });
    }
    return errorResponse(error);
  }
}
