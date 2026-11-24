import { NextResponse } from 'next/server';
import { getSandboxStatus } from '@/lib/auth/sandbox';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = getSandboxStatus();
  return NextResponse.json(status);
}
