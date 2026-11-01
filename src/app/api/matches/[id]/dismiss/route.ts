import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/auth/tenant';
import { UserRole } from '@prisma/client';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const { id } = params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: { lostItem: true, foundItem: true },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match record not found' }, { status: 404 });
    }

    const isParty = match.lostItem.reporterId === user.id || match.foundItem.reporterId === user.id;
    if (!isParty && user.role !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json(
        { error: 'You are not authorized to dismiss this match' },
        { status: 403 }
      );
    }

    await prisma.match.update({
      where: { id },
      data: { status: 'DISMISSED' },
    });

    return NextResponse.json({ message: 'Match dismissed successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
