import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: campusId } = params;

    const locations = await prisma.campusLocation.findMany({
      where: {
        campusId,
        active: true,
      },
      orderBy: { building: 'asc' },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Error fetching campus locations:', error);
    return NextResponse.json({ error: 'Failed to fetch campus locations' }, { status: 500 });
  }
}
