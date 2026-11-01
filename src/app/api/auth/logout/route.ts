import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    await destroySession(req);
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to complete logout' },
      { status: 500 }
    );
  }
}
