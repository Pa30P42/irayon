import { SESSION_COOKIE_NAME } from '@/auth.config';
import { routing } from '@/i18n/routing';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/admin-session';
import { getToken } from 'next-auth/jwt';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

/**
 * OPTIMISTIC gate. This runs on the edge and never touches the database — it
 * decides only whether a request may reach the server at all. Every handler
 * and page behind it re-checks `role`/`sessionVersion`/`suspendedAt` against
 * Postgres via `requireUser()`/`requireAdmin()` in `src/lib/auth-helpers.ts`.
 *
 * Treat this file as a performance optimisation with a security benefit, never
 * as the security boundary itself.
 */

// ---------------------------------------------------------------------------
// Path classification
// ---------------------------------------------------------------------------

const LOCALE_PREFIX = new RegExp(`^/(?:${routing.locales.join('|')})(?=/|$)`);

/** `/az/host/listings` → `/host/listings`; `/host` → `/host`. */
const stripLocale = (pathname: string): string => pathname.replace(LOCALE_PREFIX, '') || '/';

const startsWithSegment = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const isAdminPath = (pathname: string): boolean =>
  startsWithSegment(pathname, '/admin') || startsWithSegment(pathname, '/api/admin');

/**
 * Break-glass surface. Reachable ONLY while `ADMIN_BREAK_GLASS=true`; with the
 * mechanism disarmed these paths are gated like any other admin path, so the
 * credential form can't be found, probed, or brute-forced in normal operation.
 */
export const isBreakGlassPath = (pathname: string): boolean =>
  pathname === '/admin/login' ||
  pathname === '/api/admin/auth/login' ||
  pathname === '/api/admin/auth/logout';

/** Private API prefixes: authenticated, never cached, never indexed. */
const PRIVATE_API_PREFIXES = [
  '/api/admin',
  '/api/host',
  '/api/account',
  '/api/bookings',
  '/api/conversations',
  '/api/session',
] as const;

export const isPrivateApiPath = (pathname: string): boolean =>
  PRIVATE_API_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));

/** Localized page sections that require a signed-in user. */
const PRIVATE_PAGE_PREFIXES = ['/host', '/account'] as const;

export const isPrivatePagePath = (pathname: string): boolean => {
  const bare = stripLocale(pathname);
  return PRIVATE_PAGE_PREFIXES.some((prefix) => startsWithSegment(bare, prefix));
};

/**
 * `/api/account/me` is the header's "who am I" probe: it answers
 * `{user: null}` for anonymous visitors by design and must NOT be gated, or
 * every logged-out page load would 401 in the console.
 */
const isPublicPrivateApiException = (pathname: string): boolean =>
  pathname === '/api/account/me' || startsWithSegment(pathname, '/api/session');

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

const apiUnauthorized = (): NextResponse =>
  new NextResponse(JSON.stringify({ error: { message: 'Authentication required' } }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });

const apiForbidden = (): NextResponse =>
  new NextResponse(JSON.stringify({ error: { message: 'Admin access required' } }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  });

const misconfigured = (message: string): NextResponse => new NextResponse(message, { status: 503 });

/**
 * Layer-2 defense for crawlers plus a hard no-cache. The admin layout already
 * sets a meta robots tag, but spiders fetch the URL before parsing HTML, so a
 * response header is more reliable — and private responses carry drafts,
 * bookings, and messages that must never land in a shared cache.
 *
 * Applied centrally so no individual private handler can forget it.
 */
const withNoIndex = (response: NextResponse): NextResponse => {
  response.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  response.headers.set('cache-control', 'private, no-store');
  return response;
};

// ---------------------------------------------------------------------------
// Token reading
// ---------------------------------------------------------------------------

const isSecureRequest = (request: NextRequest): boolean =>
  request.nextUrl.protocol === 'https:' || SESSION_COOKIE_NAME.startsWith('__Host-');

type SessionClaims = { sub?: string; role?: string } | null;

/**
 * Reads and VERIFIES the Auth.js JWT. `getToken` is Web-Crypto only, which is
 * what lets an authorization decision happen on the edge at all.
 */
async function readSessionToken(request: NextRequest): Promise<SessionClaims> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    return (await getToken({
      req: request,
      secret,
      cookieName: SESSION_COOKIE_NAME,
      // The salt must match the cookie name Auth.js encrypted the JWE with.
      salt: SESSION_COOKIE_NAME,
      secureCookie: isSecureRequest(request),
    })) as SessionClaims;
  } catch {
    // A malformed or undecryptable token is simply "not signed in".
    return null;
  }
}

const isBreakGlassEnabled = (): boolean => process.env.ADMIN_BREAK_GLASS === 'true';

async function hasBreakGlassCookie(request: NextRequest): Promise<boolean> {
  if (!isBreakGlassEnabled()) return false;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) return false;
  return verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

/** Locale to use for a redirect, taken from the URL the user actually asked for. */
const localeOf = (pathname: string): string => {
  const match = LOCALE_PREFIX.exec(pathname);
  return match ? match[0].slice(1) : routing.defaultLocale;
};

const signInRedirect = (request: NextRequest, pathname: string, search: string): NextResponse => {
  const url = request.nextUrl.clone();
  url.pathname = `/${localeOf(pathname)}/signin`;
  url.search = '';
  url.searchParams.set('next', pathname + (search || ''));
  return NextResponse.redirect(url);
};

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const gated = isAdminPath(pathname) || isPrivateApiPath(pathname) || isPrivatePagePath(pathname);

  // Fail CLOSED on a missing signing secret. Without it `getToken` cannot
  // verify anything, so "let everyone through" and "let nobody through" are the
  // only options — and on a marketplace holding other people's bookings the
  // choice makes itself. Public pages stay up; only gated paths 503.
  if (gated && (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32)) {
    return withNoIndex(
      misconfigured('Authentication is not configured: set AUTH_SECRET (at least 32 characters).'),
    );
  }

  // --- Admin ---------------------------------------------------------------
  if (isAdminPath(pathname)) {
    if (isBreakGlassPath(pathname)) {
      if (isBreakGlassEnabled()) return withNoIndex(NextResponse.next());
      // Disarmed: send a human to normal sign-in, refuse the API outright.
      if (pathname.startsWith('/api/')) return withNoIndex(apiUnauthorized());
      return withNoIndex(signInRedirect(request, pathname, search));
    }

    if (await hasBreakGlassCookie(request)) return withNoIndex(NextResponse.next());

    const token = await readSessionToken(request);
    if (!token?.sub) {
      if (pathname.startsWith('/api/')) return withNoIndex(apiUnauthorized());
      return withNoIndex(signInRedirect(request, pathname, search));
    }
    if (token.role !== 'admin') {
      // Signed in, wrong role. A redirect to sign-in would loop them forever.
      if (pathname.startsWith('/api/')) return withNoIndex(apiForbidden());
      return withNoIndex(new NextResponse('Not found', { status: 404 }));
    }
    return withNoIndex(NextResponse.next());
  }

  // --- Private APIs --------------------------------------------------------
  if (isPrivateApiPath(pathname)) {
    if (isPublicPrivateApiException(pathname)) {
      return withNoIndex(NextResponse.next());
    }
    const token = await readSessionToken(request);
    if (!token?.sub) return withNoIndex(apiUnauthorized());
    return withNoIndex(NextResponse.next());
  }

  // --- Private pages (/{locale}/host/*, /{locale}/account/*) ---------------
  if (isPrivatePagePath(pathname)) {
    const token = await readSessionToken(request);
    if (!token?.sub) return withNoIndex(signInRedirect(request, pathname, search));
    // Authenticated: hand off to next-intl for locale handling, but keep the
    // response private — host dashboards and booking lists are per-user.
    return withNoIndex(intlMiddleware(request));
  }

  // Auth.js endpoints: pass through untouched, but never cached or indexed.
  if (startsWithSegment(pathname, '/api/auth')) {
    return withNoIndex(NextResponse.next());
  }

  // Remaining public API routes (/api/listings, /api/regions, …) are not
  // localized and set their own CDN cache headers.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Everything else flows through next-intl.
  return intlMiddleware(request);
}

export const config = {
  /**
   * Static assets are excluded by an explicit EXTENSION ALLOWLIST, not by the
   * old `.*\..*` "contains a dot" rule.
   *
   * That rule was a hole: `/admin/x.y` contains a dot, so it never reached this
   * middleware and was never gated — the request went straight to the app
   * router. Anything matching a real admin route with a dot anywhere in the
   * path bypassed the gate entirely.
   *
   * Matching on a trailing known-asset extension closes it while still keeping
   * images, fonts, and `robots.txt`/`sitemap.xml` off the middleware path.
   */
  matcher: [
    '/((?!_next/|_vercel/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|bmp|txt|xml|json|webmanifest|css|js|mjs|map|woff|woff2|ttf|otf|eot|mp4|webm|pdf)$).*)',
  ],
};
