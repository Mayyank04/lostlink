import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'lostlink_session';

function getSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'dev_secret_lostlink_session_key_32_bytes_min_12345';
  return new TextEncoder().encode(secret.padEnd(32, '!'));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets, api routes, and Next.js internal files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  let sessionUser: { role?: string; userId?: string; isOnboarded?: boolean } | null = null;
  if (token) {
    try {
      const secret = getSecretKey();
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
      sessionUser = payload as any;
    } catch {
      sessionUser = null;
    }
  }

  // Helper to determine destination for authenticated user
  const getAuthenticatedRedirectUrl = (user: { role?: string; isOnboarded?: boolean }) => {
    const role = (user.role || '').toUpperCase();
    if (role === 'PLATFORM_ADMIN') {
      return new URL('/platform-admin', req.url);
    }
    if (role === 'COLLEGE_ADMIN' || role === 'COLLEGE_MODERATOR') {
      return new URL('/college-admin', req.url);
    }
    // Student: check if onboarding completed
    if (user.isOnboarded === false) {
      return new URL('/onboarding/student', req.url);
    }
    return new URL('/dashboard', req.url);
  };

  // 1. Root page "/" handling
  if (pathname === '/') {
    if (!sessionUser) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.redirect(getAuthenticatedRedirectUrl(sessionUser));
  }

  // 2. Unauthenticated users visiting protected student pages -> redirect to /login
  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/campus/') ||
    pathname.startsWith('/report/') ||
    pathname.startsWith('/onboarding') ||
    pathname === '/profile';

  if (isProtectedPath && !sessionUser) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Authenticated users visiting auth entry points -> redirect to dashboard/onboarding
  const isAuthEntryPoint =
    pathname === '/login' ||
    pathname === '/auth/login' ||
    pathname === '/register' ||
    pathname === '/auth/register';

  if (isAuthEntryPoint && sessionUser) {
    return NextResponse.redirect(getAuthenticatedRedirectUrl(sessionUser));
  }

  // 4. All other pages (including /auth/verify-college, /colleges, etc., or unknown pages) pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads/).*)',
  ],
};
