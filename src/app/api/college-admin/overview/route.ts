import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireCollegeAdmin, errorResponse, AuthError } from '@/lib/auth/tenant';
import { ItemReportType, ItemStatus, ClaimStatus, MembershipStatus } from '@prisma/client';

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

    const college = await prisma.college.findUnique({
      where: { id: collegeId },
      include: {
        campuses: {
          include: {
            locations: true,
          },
        },
      },
    });

    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    const [
      totalStudents,
      verifiedStudents,
      pendingStudents,
      lostItems,
      foundItems,
      returnedItems,
      pendingClaims,
      underReviewClaims,
      approvedClaims,
      recentItems,
      recentClaims,
    ] = await Promise.all([
      prisma.collegeMembership.count({ where: { collegeId } }),
      prisma.collegeMembership.count({ where: { collegeId, status: MembershipStatus.VERIFIED } }),
      prisma.collegeMembership.count({ where: { collegeId, status: MembershipStatus.PENDING } }),
      prisma.item.count({ where: { collegeId, type: ItemReportType.LOST } }),
      prisma.item.count({ where: { collegeId, type: ItemReportType.FOUND } }),
      prisma.item.count({ where: { collegeId, status: ItemStatus.RETURNED } }),
      prisma.claim.count({
        where: {
          status: ClaimStatus.PENDING,
          item: { collegeId },
        },
      }),
      prisma.claim.count({
        where: {
          status: ClaimStatus.UNDER_REVIEW,
          item: { collegeId },
        },
      }),
      prisma.claim.count({
        where: {
          status: ClaimStatus.APPROVED,
          item: { collegeId },
        },
      }),
      prisma.item.findMany({
        where: { collegeId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          campus: { select: { name: true } },
          location: { select: { name: true } },
        },
      }),
      prisma.claim.findMany({
        where: { item: { collegeId } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          claimant: { select: { id: true, name: true, email: true } },
          item: { select: { id: true, name: true, type: true, status: true } },
        },
      }),
    ]);

    const totalReports = lostItems + foundItems;
    const recoveryRate = totalReports > 0 ? Math.round((returnedItems / totalReports) * 100) : 0;

    return NextResponse.json({
      success: true,
      college: {
        id: college.id,
        name: college.name,
        slug: college.slug,
        status: college.status,
        city: college.city,
        state: college.state,
        emailDomains: college.emailDomains,
        logoUrl: college.logoUrl,
        campuses: college.campuses,
      },
      stats: {
        totalStudents,
        verifiedStudents,
        pendingStudents,
        lostItems,
        foundItems,
        returnedItems,
        pendingClaims,
        underReviewClaims,
        approvedClaims,
        recoveryRate,
      },
      recentItems,
      recentClaims,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
