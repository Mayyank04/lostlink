import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';

export const dynamic = 'force-dynamic';

const updatePrefSchema = z.object({
  emailMatches: z.boolean().optional(),
  emailClaims: z.boolean().optional(),
  emailMessages: z.boolean().optional(),
  emailUpdates: z.boolean().optional(),
  inAppAlerts: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);

    let pref = await prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: { userId: user.id },
      });
    }

    return NextResponse.json({ preferences: pref });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const result = updatePrefSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const pref = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...result.data,
      },
      update: result.data,
    });

    return NextResponse.json({ message: 'Notification preferences updated', preferences: pref });
  } catch (error) {
    return errorResponse(error);
  }
}
