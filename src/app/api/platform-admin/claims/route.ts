import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, ItemStatus } from '@prisma/client';
import { z } from 'zod';

const updateClaimSchema = z.object({
  id: z.string(),
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_EVIDENCE', 'ESCALATE']),
  reason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const { searchParams } = new URL(req.url);
    const collegeId = searchParams.get('collegeId');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (collegeId && collegeId !== 'ALL') {
      where.item = { collegeId };
    }
    if (status && status !== 'ALL') {
      where.status = status as ClaimStatus;
    }

    const [total, claims] = await Promise.all([
      prisma.claim.count({ where }),
      prisma.claim.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: {
              id: true,
              reportNumber: true,
              name: true,
              type: true,
              status: true,
              college: { select: { id: true, name: true, slug: true } },
            },
          },
          claimant: {
            select: { id: true, name: true, email: true },
          },
          handoverChallenge: {
            select: { id: true, status: true, expiresAt: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      claims,
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

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);

    const body = await req.json();
    const validated = updateClaimSchema.parse(body);

    const claim = await prisma.claim.findUnique({
      where: { id: validated.id },
      include: { item: true, claimant: true },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let targetStatus: ClaimStatus;
      if (validated.action === 'APPROVE') {
        targetStatus = ClaimStatus.APPROVED;
      } else if (validated.action === 'REJECT') {
        targetStatus = ClaimStatus.REJECTED;
      } else {
        targetStatus = ClaimStatus.UNDER_REVIEW;
      }

      const updatedClaim = await tx.claim.update({
        where: { id: validated.id },
        data: {
          status: targetStatus,
          reviewedBy: user.email,
          reviewedAt: new Date(),
          rejectionReason: validated.action === 'REJECT' ? validated.reason || 'Rejected by Super Admin' : undefined,
        },
      });

      // Update item status if rejected and no other pending claims
      if (targetStatus === ClaimStatus.REJECTED) {
        const remainingPending = await tx.claim.count({
          where: {
            itemId: claim.itemId,
            status: { in: [ClaimStatus.PENDING, ClaimStatus.UNDER_REVIEW, ClaimStatus.APPROVED] },
            id: { not: claim.id },
          },
        });
        if (remainingPending === 0) {
          await tx.item.update({
            where: { id: claim.itemId },
            data: { status: ItemStatus.OPEN },
          });
        }
      } else if (targetStatus === ClaimStatus.APPROVED) {
        await tx.item.update({
          where: { id: claim.itemId },
          data: { status: ItemStatus.CLAIM_PENDING },
        });
      }

      // Record status history
      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          actorId: user.id,
          fromStatus: claim.status,
          toStatus: targetStatus,
          notes: validated.reason || `Action ${validated.action} executed by Super Admin`,
        },
      });

      // Record audit log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: claim.item.collegeId,
          action: `SUPER_ADMIN_CLAIM_${validated.action}`,
          resourceType: 'CLAIM',
          resourceId: claim.id,
          metadata: JSON.stringify({
            referenceNumber: claim.referenceNumber,
            fromStatus: claim.status,
            toStatus: targetStatus,
            reason: validated.reason,
          }),
        },
      });

      return updatedClaim;
    });

    return NextResponse.json({
      message: `Claim ${claim.referenceNumber} updated to ${updated.status}`,
      claim: updated,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues?.[0]?.message || 'Validation error' }, { status: 400 });
    }
    return errorResponse(error);
  }
}

