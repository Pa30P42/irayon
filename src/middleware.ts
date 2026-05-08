import { routing } from '@/i18n/routing';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/admin-session';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const isAdminPath = (pathname: string): boolean =>
  pathname === '/admin' ||
  pathname.startsWith('/admin/') ||
  pathname === '/api/admin' ||
  pathname.startsWith('/api/admin/');

const isPublicAdminPath = (pathname: string): boolean =>
  pathname === '/admin/login' ||
  pathname === '/api/admin/auth/login' ||
  pathname === '/api/admin/auth/logout';

const apiUnauthorized = (): NextResponse =>
  new NextResponse(JSON.stringify({ error: { message: 'Authentication required' } }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });

const misconfigured = (message: string): NextResponse => new NextResponse(message, { status: 503 });

/**
 * Layer-2 defense for crawlers: every admin/api-admin response carries
 * `X-Robots-Tag: noindex, nofollow, noarchive`. The admin layout already sets
 * a meta robots tag, but spiders fetch the URL before parsing the HTML, so a
 * response header is more reliable.
 */
const withNoIndex = (response: NextResponse): NextResponse => {
  response.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  return response;
};

export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isAdminPath(pathname)) {
    const credsConfigured =
      !!process.env.ADMIN_LOGIN &&
      !!process.env.ADMIN_PASSWORD &&
      !!process.env.ADMIN_SESSION_SECRET &&
      process.env.ADMIN_SESSION_SECRET.length >= 32;

    if (!credsConfigured) {
      return withNoIndex(
        misconfigured(
          'Admin auth is not configured: set ADMIN_LOGIN, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET (≥32 chars).',
        ),
      );
    }

    if (isPublicAdminPath(pathname)) {
      return withNoIndex(NextResponse.next());
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const valid = await verifyAdminSession(token);
    if (valid) return withNoIndex(NextResponse.next());

    if (pathname.startsWith('/api/')) return withNoIndex(apiUnauthorized());

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.search = '';
    if (pathname !== '/admin' && pathname !== '/admin/login') {
      loginUrl.searchParams.set('next', pathname + (search || ''));
    }
    return withNoIndex(NextResponse.redirect(loginUrl));
  }

  // Public API routes (/api/listings, /api/regions, …) are not localized.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Everything else flows through next-intl.
  return intlMiddleware(request);
}

export const config = {
  // Excludes static files and Next internals; admin routes are matched and
  // gated above. API routes other than /api/admin pass straight through.
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
