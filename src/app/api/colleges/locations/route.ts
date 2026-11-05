import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CollegeStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country')?.trim();
    const state = searchParams.get('state')?.trim();

    const baseWhere: any = {
      status: CollegeStatus.ACTIVE,
      isArchived: false,
    };

    // 1. Fetch distinct countries directly from database
    const countryRows = await prisma.college.findMany({
      where: baseWhere,
      distinct: ['country'],
      select: { country: true },
      orderBy: { country: 'asc' },
    });
    const countries = Array.from(new Set(countryRows.map((r) => r.country.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );

    // 2. Fetch distinct states (filtered by country if specified)
    const stateWhere: any = { ...baseWhere };
    if (country && country !== 'ALL') {
      stateWhere.country = { equals: country, mode: 'insensitive' };
    }
    const stateRows = await prisma.college.findMany({
      where: stateWhere,
      distinct: ['state'],
      select: { state: true },
      orderBy: { state: 'asc' },
    });
    const states = Array.from(new Set(stateRows.map((r) => r.state.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );

    // 3. Fetch distinct cities (filtered by country and state if specified)
    const cityWhere: any = { ...baseWhere };
    if (country && country !== 'ALL') {
      cityWhere.country = { equals: country, mode: 'insensitive' };
    }
    if (state && state !== 'ALL') {
      cityWhere.state = { equals: state, mode: 'insensitive' };
    }
    const cityRows = await prisma.college.findMany({
      where: cityWhere,
      distinct: ['city'],
      select: { city: true },
      orderBy: { city: 'asc' },
    });
    const cities = Array.from(new Set(cityRows.map((r) => r.city.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );

    return NextResponse.json({
      success: true,
      countries,
      states,
      cities,
      selected: {
        country: country || null,
        state: state || null,
      },
    });
  } catch (error) {
    console.error('Error in /api/colleges/locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location hierarchies' },
      { status: 500 }
    );
  }
}

