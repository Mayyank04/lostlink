import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

const DEFAULT_SETTINGS: Record<string, { value: string; description: string; isPublic: boolean }> = {
  maintenanceMode: { value: 'false', description: 'Enable system maintenance mode (blocks non-admin access)', isPublic: true },
  openRegistration: { value: 'true', description: 'Allow new students to register across colleges', isPublic: true },
  defaultMatchThreshold: { value: '0.65', description: 'Minimum confidence score for automatic match recommendations', isPublic: false },
  maxClaimsPerStudent: { value: '5', description: 'Maximum active pending claims a student can have at one time', isPublic: false },
  notificationRetentionDays: { value: '90', description: 'Days to retain delivered in-app notifications before pruning', isPublic: false },
  requireEmailDomainMatch: { value: 'true', description: 'Enforce student email domain matching college allowed domains', isPublic: true },
  supportEmail: { value: 'support@lostlink.org', description: 'Official support and contact email for LostLink', isPublic: true },
  platformAnnouncement: { value: '', description: 'System-wide banner message broadcast to all users', isPublic: true },
};

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const dbSettings = await prisma.platformSetting.findMany();
    const settingsMap: Record<string, string> = {};

    // Initialize with defaults
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      settingsMap[key] = def.value;
    }

    // Overlay database values
    for (const s of dbSettings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({
      success: true,
      settings: settingsMap,
      metadata: DEFAULT_SETTINGS,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const body = await req.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid settings payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { settings } = parsed.data;
    const updatedKeys: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const [key, val] of Object.entries(settings)) {
        const stringVal = String(val);
        await tx.platformSetting.upsert({
          where: { key },
          update: {
            value: stringVal,
            updatedBy: user.id,
          },
          create: {
            key,
            value: stringVal,
            description: DEFAULT_SETTINGS[key]?.description || 'Custom configuration key',
            isPublic: DEFAULT_SETTINGS[key]?.isPublic ?? false,
            updatedBy: user.id,
          },
        });
        updatedKeys.push(key);
      }

      await tx.auditLog.create({
        data: {
          action: 'SETTINGS_UPDATE',
          actorId: user.id,
          resourceType: 'PlatformSetting',
          metadata: JSON.stringify({ updatedKeys, count: updatedKeys.length }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedKeys.length} platform settings`,
      updatedKeys,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
