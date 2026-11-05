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

    // 1. Fetch all distinct countries available in active colleges
    const allColleges = await prisma.college.findMany({
      where: baseWhere,
      select: { country: true, state: true, city: true },
    });

    const countriesSet = new Set<string>();
    const statesSet = new Set<string>();
    const citiesSet = new Set<string>();

    for (const c of allColleges) {
      if (c.country) countriesSet.add(c.country.trim());

      // Filter states by country if country parameter is passed
      const matchCountry = !country || country === 'ALL' || c.country.toLowerCase() === country.toLowerCase();
      if (matchCountry && c.state) {
        statesSet.add(c.state.trim());
      }

      // Filter cities by country and state if provided
      const matchState = !state || state === 'ALL' || c.state.toLowerCase() === state.toLowerCase();
      if (matchCountry && matchState && c.city) {
        citiesSet.add(c.city.trim());
      }
    }

    const countries = Array.from(countriesSet).sort((a, b) => a.localeCompare(b));
    const states = Array.from(statesSet).sort((a, b) => a.localeCompare(b));
    const cities = Array.from(citiesSet).sort((a, b) => a.localeCompare(b));

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

