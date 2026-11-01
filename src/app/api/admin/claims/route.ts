import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus, UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);

    const isPlatformAdmin = user.role === UserRole.PLATFORM_ADMIN;
    const isCollegeAdmin = user.role === UserRole.COLLEGE_ADMIN || user.role === UserRole.COLLEGE_MODERATOR;

    if (!isPlatformAdmin && !isCollegeAdmin) {
      return NextResponse.json(
        { error: 'Institutional moderation privileges required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const collegeId = searchParams.get('collegeId');
    const campusId = searchParams.get('campusId');
    const statusParam = searchParams.get('status') as ClaimStatus | null;
    const search = searchParams.get('search')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const where: any = {};

    if (isPlatformAdmin) {
      if (collegeId) where.item = { collegeId };
    } else {
      const allowedColleges = user.memberships.map((m) => m.collegeId);
      where.item = {
        collegeId: collegeId && allowedColleges.includes(collegeId) ? collegeId : { in: allowedColleges },
      };
    }

    if (campusId) {
      where.item = { ...(where.item || {}), campusId };
    }

    if (statusParam) {
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
        include: {
          claimant: { select: { id: true, name: true, email: true, department: true } },
          item: {
            include: {
              college: { select: { id: true, name: true, shortName: true } },
              campus: { select: { id: true, name: true } },
              reporter: { select: { id: true, name: true, email: true } },
              images: true,
            },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { actor: { select: { name: true } } },
          },
          handoverChallenge: { select: { id: true, status: true, expiresAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    const formatted = claims.map((c) => {
      let evidenceParsed = null;
      try {
        if (c.privateEvidenceReference) {
          evidenceParsed = JSON.parse(c.privateEvidenceReference);
        }
      } catch {
        evidenceParsed = { raw: c.privateEvidenceReference };
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
        collegeId: c.item.collegeId,
        collegeName: c.item.college.name,
        campusName: c.item.campus?.name || null,
        claimantId: c.claimantId,
        claimantName: c.claimant.name,
        claimantEmail: c.claimant.email,
        claimantDepartment: c.claimant.department,
        finderId: c.item.reporterId,
        finderName: c.item.reporter.name,
        finderEmail: c.item.reporter.email,
        evidence: evidenceParsed,
        additionalProofNotes: c.additionalProofNotes,
        rejectionReason: c.rejectionReason,
        lastAction: c.statusHistory[0]
          ? {
              action: c.statusHistory[0].toStatus,
              actor: c.statusHistory[0].actor.name,
              notes: c.statusHistory[0].notes,
              timestamp: c.statusHistory[0].createdAt.toISOString(),
            }
          : null,
        hasHandoverChallenge: Boolean(c.handoverChallenge),
        handoverStatus: c.handoverChallenge?.status || null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      claims: formatted,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

