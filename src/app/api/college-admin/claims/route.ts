import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireCollegeAdmin, errorResponse, AuthError } from '@/lib/auth/tenant';
import { ClaimStatus, MembershipStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    let collegeId = searchParams.get('collegeId');
    if (user.role !== 'PLATFORM_ADMIN' || !collegeId) {
      const membership = user.memberships.find((m) => m.status === MembershipStatus.VERIFIED) || user.memberships[0];
      if (!membership) {
        throw new AuthError('No college association found for this administrator', 403);
      }
      collegeId = membership.collegeId;
    }

    requireCollegeAdmin(user, collegeId);

    const statusParam = searchParams.get('status') as ClaimStatus | null;
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      item: { collegeId },
    };

    if (statusParam && Object.values(ClaimStatus).includes(statusParam)) {
      where.status = statusParam;
    }

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { claimant: { name: { contains: search, mode: 'insensitive' } } },
        { claimant: { email: { contains: search, mode: 'insensitive' } } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
        { item: { reportNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, claims] = await Promise.all([
      prisma.claim.count({ where }),
      prisma.claim.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          claimant: { select: { id: true, name: true, email: true, department: true } },
          item: {
            include: {
              campus: { select: { id: true, name: true } },
              reporter: { select: { id: true, name: true, email: true } },
              images: { select: { id: true, url: true } },
            },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { actor: { select: { name: true } } },
          },
          handoverChallenge: { select: { id: true, status: true, expiresAt: true } },
        },
      }),
    ]);

    const formatted = claims.map((c) => {
      let evidence = null;
      try {
        if (c.privateEvidenceReference) {
          evidence = JSON.parse(c.privateEvidenceReference);
        }
      } catch {
        evidence = { raw: c.privateEvidenceReference };
      }

      return {
        id: c.id,
        referenceNumber: c.referenceNumber,
        status: c.status,
        itemId: c.itemId,
        itemReportNumber: c.item.reportNumber,
        itemTitle: c.item.name,
        itemCategory: c.item.category,
        itemImageUrl: c.item.images[0]?.url || null,
        campusName: c.item.campus?.name || null,
        claimant: c.claimant,
        finder: c.item.reporter,
        evidence,
        additionalProofNotes: c.additionalProofNotes,
        rejectionReason: c.rejectionReason,
        handoverStatus: c.handoverChallenge?.status || null,
        handoverChallengeId: c.handoverChallenge?.id || null,
        lastAction: c.statusHistory[0]
          ? {
              action: c.statusHistory[0].toStatus,
              actor: c.statusHistory[0].actor.name,
              notes: c.statusHistory[0].notes,
              timestamp: c.statusHistory[0].createdAt.toISOString(),
            }
          : null,
        createdAt: c.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      collegeId,
      claims: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

