import { NextResponse } from 'next/server';
import { requireAuth, requireCollegeMembership, errorResponse } from '@/lib/auth/tenant';
import { recalculateMatchesForCollege } from '@/lib/matching/matchEngine';
import { checkRateLimit } from '@/lib/auth/rateLimit';

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);

    // Rate limit match recalculations per user to 5 requests per 2 minutes
    const rate = checkRateLimit(`match-recalc:${user.id}`, 5, 120 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Recalculation rate limit exceeded. Please wait before refreshing radar.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const collegeId = searchParams.get('collegeId') || user.memberships[0]?.collegeId;

    if (!collegeId) {
      return NextResponse.json({ error: 'College ID is required' }, { status: 400 });
    }

    requireCollegeMembership(user, collegeId);

    const result = await recalculateMatchesForCollege(collegeId);

    return NextResponse.json({
      message: 'Match radar recalculation complete',
      ...result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

