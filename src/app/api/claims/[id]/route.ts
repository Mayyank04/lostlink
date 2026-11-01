import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, ItemStatus, UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

const reviewClaimSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISPUTED']),
  reviewNotes: z.string().optional(),
  reasonCode: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            college: true,
            campus: true,
            images: true,
            reporter: { select: { id: true, name: true, email: true } },
          },
        },
        claimant: { select: { id: true, name: true, email: true } },
        statusHistory: {
          include: {
            actor: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        handoverChallenge: {
          select: {
            id: true,
            status: true,
            expiresAt: true,
            verificationMethod: true,
            handoverLocation: true,
            confirmedAt: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const isClaimant = claim.claimantId === user.id;
    const isFinder = claim.item.reporterId === user.id;
    const isCollegeAdmin =
      user.role === UserRole.PLATFORM_ADMIN ||
      user.memberships.some(
        (m) =>
          m.collegeId === claim.item.collegeId &&
          (user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR)
      );

    if (!isClaimant && !isFinder && !isCollegeAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to view this ownership claim.' },
        { status: 403 }
      );
    }

    // Parse private evidence only for authorized participants
    let parsedEvidence: any = null;
    if (claim.privateEvidenceReference) {
      try {
        parsedEvidence = JSON.parse(claim.privateEvidenceReference);
      } catch {
        parsedEvidence = claim.privateEvidenceReference;
      }
    }

    return NextResponse.json({
      claim: {
        id: claim.id,
        referenceNumber: claim.referenceNumber,
        itemId: claim.itemId,
        itemReportNumber: claim.item.reportNumber,
        itemTitle: claim.item.name,
        itemCategory: claim.item.category,
        itemImageUrl: claim.item.images[0]?.url || null,
        collegeId: claim.item.collegeId,
        collegeName: claim.item.college.name,
        campusName: claim.item.campus?.name || null,
        claimantId: claim.claimantId,
        claimantName: claim.claimant.name,
        claimantEmail: claim.claimant.email,
        reporterId: claim.item.reporterId,
        reporterName: claim.item.reporter.name,
        status: claim.status,
        additionalProofNotes: claim.additionalProofNotes,
        evidenceDetails: parsedEvidence,
        statusHistory: claim.statusHistory.map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          actorName: h.actor.name,
          notes: h.notes,
          reasonCode: h.reasonCode,
          createdAt: h.createdAt.toISOString(),
        })),
        handoverCode: (isClaimant || isCollegeAdmin) ? claim.handoverCode : null,
        handoverChallenge: claim.handoverChallenge,
        createdAt: claim.createdAt.toISOString(),
        updatedAt: claim.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { item: true, claimant: true },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const isItemFinder = claim.item.reporterId === user.id;
    const isCollegeAdmin =
      user.role === UserRole.PLATFORM_ADMIN ||
      (user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR);

    if (!isItemFinder && !isCollegeAdmin) {
      return NextResponse.json(
        { error: 'Only the finder or an institutional moderator may review this claim' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = reviewClaimSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid review status transition' }, { status: 400 });
    }

    const { status, reviewNotes, reasonCode } = result.data;
    const targetStatus = status === 'APPROVED' ? ClaimStatus.HANDOVER_PENDING : (status as ClaimStatus);

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update claim status
      const updatedClaim = await tx.claim.update({
        where: { id },
        data: {
          status: targetStatus,
          additionalProofNotes: reviewNotes
            ? `${claim.additionalProofNotes || ''}\n[Reviewer Note]: ${reviewNotes}`
            : claim.additionalProofNotes,
          reviewedBy: user.id,
          reviewedAt: new Date(),
          rejectionReason: status === 'REJECTED' ? reasonCode || reviewNotes : undefined,
        },
      });

      // 2. Add status history audit record
      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: claim.status,
          toStatus: targetStatus,
          actorId: user.id,
          reasonCode: reasonCode || null,
          notes: reviewNotes || `Claim status updated to ${targetStatus}`,
        },
      });

      // 3. Handle item status transitions
      if (status === 'APPROVED') {
        await tx.item.update({
          where: { id: claim.itemId },
          data: { status: ItemStatus.CLAIM_PENDING },
        });

        // Notify claimant of approval & handover readiness
        await tx.notification.create({
          data: {
            userId: claim.claimantId,
            type: 'claim_approved',
            title: 'Claim Approved! Handover Ready 🎉',
            message: `Your ownership claim for "${claim.item.name}" has been approved! Proceed to the return custody desk.`,
            resourceId: claim.id,
            linkUrl: `/claims/${claim.id}`,
          },
        });
      } else if (status === 'REJECTED') {
        const otherPending = await tx.claim.count({
          where: {
            itemId: claim.itemId,
            status: { in: [ClaimStatus.PENDING, ClaimStatus.UNDER_REVIEW, ClaimStatus.HANDOVER_PENDING] },
            id: { not: claim.id },
          },
        });

        if (otherPending === 0) {
          await tx.item.update({
            where: { id: claim.itemId },
            data: { status: ItemStatus.OPEN },
          });
        }

        await tx.notification.create({
          data: {
            userId: claim.claimantId,
            type: 'claim_rejected',
            title: 'Claim Verification Declined',
            message: `Your claim for "${claim.item.name}" could not be confirmed by the reviewer. Reason: ${reasonCode || 'Insufficient proof'}.`,
            resourceId: claim.id,
            linkUrl: `/claims/${claim.id}`,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: claim.item.collegeId,
          action: `CLAIM_${status}`,
          resourceType: 'CLAIM',
          resourceId: claim.id,
          metadata: JSON.stringify({ itemId: claim.itemId, status: targetStatus, reasonCode }),
        },
      });

      return updatedClaim;
    });

    return NextResponse.json({
      message: `Claim successfully updated to ${targetStatus}`,
      claim: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
