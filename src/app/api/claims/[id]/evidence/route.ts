import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const provideEvidenceSchema = z.object({
  answers: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional(),
  fileUrl: z.string().optional().nullable(),
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
          include: { reporter: true },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (claim.claimantId !== user.id) {
      return NextResponse.json(
        { error: 'Only the claimant who filed this request can provide supplementary evidence' },
        { status: 403 }
      );
    }

    if (claim.status === ClaimStatus.RETURNED || claim.status === ClaimStatus.CANCELLED) {
      return NextResponse.json(
        { error: `Cannot submit evidence for a claim in ${claim.status} status` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const result = provideEvidenceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { answers, notes, fileUrl } = result.data;

    let updatedEvidence: any = {};
    try {
      if (claim.privateEvidenceReference) {
        updatedEvidence = JSON.parse(claim.privateEvidenceReference);
      }
    } catch {
      updatedEvidence = { raw: claim.privateEvidenceReference };
    }

    if (answers) {
      updatedEvidence.supplementaryAnswers = {
        ...(updatedEvidence.supplementaryAnswers || {}),
        ...answers,
      };
    }
    if (fileUrl) {
      updatedEvidence.supplementaryFiles = [
        ...(updatedEvidence.supplementaryFiles || []),
        fileUrl,
      ];
    }

    const noteEntry = `[Claimant Supplementary Proof]: ${notes || 'Updated details provided.'}${fileUrl ? ` (Attached: ${fileUrl})` : ''}`;

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.claim.update({
        where: { id },
        data: {
          privateEvidenceReference: JSON.stringify(updatedEvidence),
          additionalProofNotes: claim.additionalProofNotes
            ? `${claim.additionalProofNotes}\n${noteEntry}`
            : noteEntry,
          status: ClaimStatus.UNDER_REVIEW,
        },
      });

      await tx.claimStatusHistory.create({
        data: {
          claimId: claim.id,
          fromStatus: claim.status,
          toStatus: ClaimStatus.UNDER_REVIEW,
          actorId: user.id,
          notes: noteEntry,
        },
      });

      // Notify the finder / desk custodian
      await tx.notification.create({
        data: {
          userId: claim.item.reporterId,
          type: 'claim_evidence_submitted',
          title: 'Supplementary Evidence Received',
          message: `Claimant has provided additional verification evidence for "${claim.item.name}".`,
          resourceId: claim.id,
          linkUrl: `/claims/${claim.id}`,
        },
      });

      return c;
    });

    return NextResponse.json({
      message: 'Supplementary evidence recorded',
      claim: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

