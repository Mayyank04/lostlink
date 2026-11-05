import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { decryptEvidence } from '@/lib/crypto/evidenceEncryption';
import { ItemStatus, UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

const updateItemSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().min(5).optional(),
  status: z.enum(['OPEN', 'CLAIM_PENDING', 'RETURNED', 'CLOSED']).optional(),
  locationDescription: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const currentUser = await getCurrentUser(req);

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        college: { select: { id: true, name: true, slug: true } },
        campus: { select: { id: true, name: true, code: true } },
        location: true,
        reporter: { select: { id: true, name: true, email: true } },
        images: true,
        privateEvidence: true,
        claims: {
          include: {
            claimant: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const isOwner = currentUser?.id === item.reporterId;
    const isAdmin =
      currentUser?.role === UserRole.PLATFORM_ADMIN ||
      currentUser?.memberships.some(
        (m) =>
          m.collegeId === item.collegeId &&
          (currentUser.role === UserRole.COLLEGE_ADMIN || currentUser.role === UserRole.COLLEGE_MODERATOR)
      );

    const canViewEvidence = isOwner || isAdmin;

    let parsedEvidence: any = null;
    if (canViewEvidence && item.privateEvidence) {
      parsedEvidence = decryptEvidence(item.privateEvidence.encryptedEvidence);
    }

    return NextResponse.json({
      item: {
        id: item.id,
        reportNumber: item.reportNumber,
        type: item.type,
        title: item.name,
        category: item.category,
        brand: item.brand,
        color: item.color,
        description: item.description,
        dateIncident: item.occurredAt.toISOString(),
        locationDescription: item.locationBuilding,
        status: item.status,
        depositedWithOffice: item.depositedWithOffice,
        collegeId: item.collegeId,
        collegeName: item.college.name,
        campusId: item.campusId,
        campusName: item.campus?.name || null,
        reporterId: item.reporterId,
        reporterName: item.reporter.name,
        reporterEmail: canViewEvidence ? item.reporter.email : null,
        primaryImage: item.images[0]?.url || null,
        images: item.images.map((img) => img.url),
        privateEvidence: parsedEvidence,
        claims: canViewEvidence
          ? item.claims.map((c) => ({
              id: c.id,
              referenceNumber: c.referenceNumber,
              claimantId: c.claimantId,
              claimantName: c.claimant.name,
              claimantEmail: c.claimant.email,
              status: c.status,
              verificationNotes: c.additionalProofNotes,
              createdAt: c.createdAt.toISOString(),
            }))
          : [],
        createdAt: item.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error retrieving item:', error);
    return NextResponse.json({ error: 'Failed to retrieve item' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const existing = await prisma.item.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const isOwner = user.id === existing.reporterId;
    const isAdmin =
      user.role === UserRole.PLATFORM_ADMIN ||
      user.memberships.some(
        (m) =>
          m.collegeId === existing.collegeId &&
          (user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR)
      );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to update this item report' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = updateItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid update parameters' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (result.data.title) updateData.name = result.data.title;
    if (result.data.description) updateData.description = result.data.description;
    if (result.data.locationDescription) updateData.locationBuilding = result.data.locationDescription;

    // Strict State Machine: Disallow bypassing claim approval and verified handover
    if (result.data.status) {
      if (result.data.status === ItemStatus.RETURNED) {
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Directly marking an item as RETURNED is not permitted. Items can only be marked returned through verified handover confirmation or administrative review.' },
            { status: 403 }
          );
        }
      } else if (result.data.status === ItemStatus.CLAIM_PENDING) {
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Item status cannot be manually set to CLAIM_PENDING. This transition is managed by the ownership verification workflow.' },
            { status: 403 }
          );
        }
      }
      updateData.status = result.data.status;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.item.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: existing.collegeId,
          action: 'ITEM_UPDATED',
          resourceType: 'ITEM',
          resourceId: id,
          metadata: JSON.stringify({ updates: updateData, updatedByRole: user.role }),
        },
      });

      return item;
    });

    return NextResponse.json({
      message: 'Item updated successfully',
      item: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const isOwner = user.id === existing.reporterId;
    const isAdmin =
      user.role === UserRole.PLATFORM_ADMIN ||
      user.memberships.some(
        (m) =>
          m.collegeId === existing.collegeId &&
          (user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR)
      );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this report' },
        { status: 403 }
      );
    }

    await prisma.$transaction([
      prisma.item.update({
        where: { id },
        data: { status: ItemStatus.CLOSED },
      }),
      prisma.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: existing.collegeId,
          action: 'ITEM_CLOSED',
          resourceType: 'ITEM',
          resourceId: id,
        },
      }),
    ]);

    return NextResponse.json({ message: 'Item report closed successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
