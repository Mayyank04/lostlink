import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireCollegeAdmin, errorResponse, AuthError } from '@/lib/auth/tenant';
import { ClaimStatus, ItemStatus } from '@prisma/client';
import { z } from 'zod';

const reviewClaimSchema = z.object({
  status: z.enum([
    ClaimStatus.UNDER_REVIEW,
    ClaimStatus.APPROVED,
    ClaimStatus.REJECTED,
    ClaimStatus.CANCELLED,
  ]),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            college: true,
            campus: true,
            location: true,
            images: true,
            reporter: { select: { id: true, name: true, email: true } },
          },
        },
        claimant: { select: { id: true, name: true, email: true, department: true } },
        statusHistory: {
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        handoverChallenge: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    requireCollegeAdmin(user, claim.item.collegeId);

    let parsedEvidence = null;
    if (claim.privateEvidenceReference) {
      try {
        parsedEvidence = JSON.parse(claim.privateEvidenceReference);
      } catch {
        parsedEvidence = { raw: claim.privateEvidenceReference };
      }
    }

    return NextResponse.json({
      success: true,
      claim: {
        id: claim.id,
        referenceNumber: claim.referenceNumber,
        status: claim.status,
        item: claim.item,
        claimant: claim.claimant,
        evidence: parsedEvidence,
        additionalProofNotes: claim.additionalProofNotes,
        rejectionReason: claim.rejectionReason,
        handoverCode: claim.handoverCode,
        handoverChallenge: claim.handoverChallenge,
        statusHistory: claim.statusHistory,
        createdAt: claim.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { item: true, claimant: true },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    requireCollegeAdmin(user, claim.item.collegeId);

    const body = await req.json();
    const parsed = reviewClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { status, notes, rejectionReason } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const claimUpdateData: any = {
        status,
        rejectionReason: status === ClaimStatus.REJECTED ? rejectionReason : null,
      };

      const updatedClaim = await tx.claim.update({
        where: { id },
        data: claimUpdateData,
      });

      // Update status history
      await tx.claimStatusHistory.create({
        data: {
          claimId: id,
          fromStatus: claim.status,
          toStatus: status,
          actorId: user.id,
          notes: notes || `Status changed to ${status} by college administrator`,
        },
      });

      // If approved, update item to CLAIM_PENDING or MATCHED if not already
      if (status === ClaimStatus.APPROVED) {
        await tx.item.update({
          where: { id: claim.itemId },
          data: { status: ItemStatus.CLAIM_PENDING },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'CLAIM_STATUS_CHANGED',
          actorId: user.id,
          collegeId: claim.item.collegeId,
          resourceType: 'Claim',
          resourceId: id,
          metadata: JSON.stringify({
            claimReference: claim.referenceNumber,
            fromStatus: claim.status,
            toStatus: status,
            notes,
          }),
        },
      });

      return updatedClaim;
    });

    return NextResponse.json({
      success: true,
      message: `Claim status updated to ${status}`,
      claim: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
