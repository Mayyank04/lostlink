import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

const requestEvidenceSchema = z.object({
  questions: z.array(z.string()).min(1, 'Please provide at least one verification question'),
  message: z.string().optional(),
});

export async function POST(
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
          },
        },
        claimant: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const isItemFinder = claim.item.reporterId === user.id;
    const isCollegeAdmin =
      user.role === UserRole.PLATFORM_ADMIN ||
      user.memberships.some(
        (m) =>
          m.collegeId === claim.item.collegeId &&
          (user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR)
      );

    if (!isItemFinder && !isCollegeAdmin) {
      return NextResponse.json(
        { error: 'Only the item finder or campus moderator can request additional evidence' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = requestEvidenceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { questions, message } = result.data;

    const note = `[Evidence Requested]: ${questions.join('; ')}${message ? ` (Note: ${message})` : ''}`;

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.claim.update({
        where: { id },
        data: {
          status: ClaimStatus.UNDER_REVIEW,
          additionalProofNotes: claim.additionalProofNotes
            ? `${claim.additionalProofNotes}\n${note}`
            : note,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: claim.status,
          toStatus: ClaimStatus.UNDER_REVIEW,
          actorId: user.id,
          notes: note,
        },
      });

      await tx.notification.create({
        data: {
          userId: claim.claimantId,
          type: 'claim_evidence_requested',
          title: 'Additional Verification Needed',
          message: `The custodian for "${claim.item.name}" has requested additional proof before releasing the item.`,
          resourceId: claim.id,
          linkUrl: `/claims/${claim.id}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: claim.item.collegeId,
          action: 'CLAIM_REQUEST_EVIDENCE',
          resourceType: 'CLAIM',
          resourceId: claim.id,
          metadata: JSON.stringify({ questions, message }),
        },
      });

      return c;
    });

    return NextResponse.json({
      message: 'Evidence request submitted successfully',
      claim: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
