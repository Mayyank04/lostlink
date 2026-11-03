import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { ClaimStatus } from '@prisma/client';

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
          handoverChallenges: {
            select: { id: true, status: true, expiresAt: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
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

