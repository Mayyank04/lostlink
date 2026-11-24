import { NextResponse } from 'next/server';
import { resolveCollegeFromEmail } from '@/lib/college/resolve-college';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`resolve-college:${ip}`, 60, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email query parameter is required' },
        { status: 400 }
      );
    }

    const result = await resolveCollegeFromEmail(email);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          message: result.message,
          domain: result.domain,
          collegeName: result.collegeName,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      college: {
        id: result.collegeId,
        name: result.collegeName,
        shortName: result.shortName,
        slug: result.slug,
        domain: result.domain,
        campusSlug: result.campusSlug,
        primaryColor: result.primaryColor,
        logoUrl: result.logoUrl,
      },
    });
  } catch (error) {
    console.error('Error resolving college from email:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to resolve college from email' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`resolve-college:${ip}`, 60, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = body?.email;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await resolveCollegeFromEmail(email);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          message: result.message,
          domain: result.domain,
          collegeName: result.collegeName,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      college: {
        id: result.collegeId,
        name: result.collegeName,
        shortName: result.shortName,
        slug: result.slug,
        domain: result.domain,
        campusSlug: result.campusSlug,
        primaryColor: result.primaryColor,
        logoUrl: result.logoUrl,
      },
    });
  } catch (error) {
    console.error('Error resolving college from email:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to resolve college from email' },
      { status: 500 }
    );
  }
}
