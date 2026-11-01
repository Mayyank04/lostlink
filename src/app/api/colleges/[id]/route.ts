import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CollegeStatus, ItemStatus, MembershipStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const college = await prisma.college.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        status: CollegeStatus.ACTIVE,
      },
      include: {
        campuses: {
          where: { status: 'ACTIVE' },
          include: {
            locations: {
              where: { active: true },
              select: {
                id: true,
                name: true,
                building: true,
                floorLabel: true,
                locationType: true,
              },
            },
          },
        },
        _count: {
          select: {
            items: { where: { status: ItemStatus.OPEN } },
            memberships: { where: { status: MembershipStatus.VERIFIED } },
          },
        },
      },
    });

    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    return NextResponse.json({ college });
  } catch (error) {
    console.error('Error fetching college details:', error);
    return NextResponse.json({ error: 'Failed to fetch college' }, { status: 500 });
  }
}
