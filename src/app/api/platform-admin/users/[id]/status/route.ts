import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { UserRole, UserStatus } from '@prisma/client';
import { z } from 'zod';

const updateUserSchema = z.object({
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(UserRole).optional(),
  revokeSessions: z.boolean().optional(),
  reason: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const body = await req.json();
    const validated = updateUserSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Protection against self-demotion or self-suspension
    if (targetUser.id === user.id) {
      if (validated.status === UserStatus.SUSPENDED) {
        return NextResponse.json({ error: 'Cannot suspend your own Platform Administrator account' }, { status: 400 });
      }
      if (validated.role && validated.role !== UserRole.PLATFORM_ADMIN) {
        return NextResponse.json({ error: 'Cannot demote your own Platform Administrator account' }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: params.id },
        data: {
          status: validated.status !== undefined ? validated.status : undefined,
          role: validated.role !== undefined ? validated.role : undefined,
        },
      });

      // Revoke sessions if requested or if account is suspended
      if (validated.revokeSessions || validated.status === UserStatus.SUSPENDED) {
        await tx.session.deleteMany({
          where: { userId: params.id },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'UPDATE_USER_STATUS',
          resourceType: 'USER',
          resourceId: targetUser.id,
          metadata: JSON.stringify({
            targetEmail: targetUser.email,
            previousStatus: targetUser.status,
            newStatus: validated.status,
            previousRole: targetUser.role,
            newRole: validated.role,
            sessionsRevoked: validated.revokeSessions || validated.status === UserStatus.SUSPENDED,
            reason: validated.reason || 'Super Admin action',
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return u;
    });

    return NextResponse.json({
      message: `User ${updated.name} (${updated.email}) updated successfully`,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation failed' }, { status: 400 });
    }
    return errorResponse(error);
  }
}
