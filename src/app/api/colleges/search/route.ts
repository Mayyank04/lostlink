import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CollegeStatus, ItemStatus, MembershipStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const country = searchParams.get('country')?.trim() || '';
    const state = searchParams.get('state')?.trim() || '';
    const city = searchParams.get('city')?.trim() || '';
    const sort = searchParams.get('sort')?.trim() || 'name_asc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10) || 12));
    const skip = (page - 1) * limit;

    // Public search only returns active, non-archived institutions
    const where: any = {
      status: CollegeStatus.ACTIVE,
      isArchived: false,
    };

    // Location filters (case-insensitive)
    if (country && country !== 'ALL') {
      where.country = { equals: country, mode: 'insensitive' };
    }
    if (state && state !== 'ALL') {
      where.state = { equals: state, mode: 'insensitive' };
    }
    if (city && city !== 'ALL') {
      where.city = { equals: city, mode: 'insensitive' };
    }

    // Keyword search (name, abbreviation/shortName, slug, city, state)
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { shortName: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Determine sorting order
    let orderBy: any = { name: 'asc' };
    if (sort === 'name_desc') {
      orderBy = { name: 'desc' };
    } else if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'popular') {
      orderBy = { memberships: { _count: 'desc' } };
    }

    const [total, colleges] = await Promise.all([
      prisma.college.count({ where }),
      prisma.college.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          shortName: true,
          slug: true,
          logoUrl: true,
          city: true,
          state: true,
          country: true,
          primaryColor: true,
          institutionType: true,
          website: true,
          emailDomains: true,
          status: true,
          createdAt: true,
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
      }),
    ]);

    const formatted = colleges.map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName || null,
      slug: c.slug,
      logoUrl: c.logoUrl,
      city: c.city,
      state: c.state,
      country: c.country,
      primaryColor: c.primaryColor || '#0F766E',
      institutionType: c.institutionType || 'University',
      website: c.website,
      domain: c.emailDomains[0] || '',
      emailDomains: c.emailDomains,
      isVerified: true,
      campuses: c.campuses,
      stats: {
        activeItems: c._count.items,
        activeMembers: c._count.memberships,
      },
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      colleges: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        q,
        country: country || null,
        state: state || null,
        city: city || null,
        sort,
      },
    });
  } catch (error) {
    console.error('Error in /api/colleges/search:', error);
    return NextResponse.json(
      { error: 'Failed to search colleges directory' },
      { status: 500 }
    );
  }
}

