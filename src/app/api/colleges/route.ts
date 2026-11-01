import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CollegeStatus, ItemStatus, MembershipStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const colleges = await prisma.college.findMany({
      where: {
        status: CollegeStatus.ACTIVE,
      },
      include: {
        campuses: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            code: true,
            addressLabel: true,
          },
        },
        _count: {
          select: {
            items: { where: { status: ItemStatus.OPEN } },
            memberships: { where: { status: MembershipStatus.VERIFIED } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = colleges.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      domain: c.emailDomains[0] || '',
      emailDomains: c.emailDomains,
      logoUrl: c.logoUrl,
      city: c.city,
      state: c.state,
      campuses: c.campuses,
      stats: {
        activeItems: c._count.items,
        activeMembers: c._count.memberships,
      },
    }));

    return NextResponse.json({ colleges: formatted });
  } catch (error) {
    console.error('Error fetching colleges:', error);
    return NextResponse.json({ error: 'Failed to fetch colleges' }, { status: 500 });
  }
}
