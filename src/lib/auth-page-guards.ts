import { routing, type Locale } from '@/i18n/routing';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/admin-session';
import type { Route } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { breakGlassUser, isBreakGlassEnabled, requireUser, type AuthUser } from './auth-helpers';

/** Break-glass admin identity from the HMAC cookie, or null. */
async function readBreakGlassUser(): Promise<AuthUser | null> {
  if (!isBreakGlassEnabled()) return null;
  const store = await cookies();
  const valid = await verifyAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  return valid ? breakGlassUser() : null;
}

/**
 * Page-level (server component) counterparts to the gates in
 * `auth-helpers.ts`. Same checks, different failure mode: a page redirects to
 * sign-in instead of returning a JSON 401.
 *
 * These exist as defense in depth. Middleware already gates `/host/*`,
 * `/account/*`, and `/admin/*` — but the middleware matcher is one regex away
 * from a hole (it had exactly that hole until Phase 1.2b), and the admin server
 * components used to rely on it 100%. A layout that checks for itself keeps
 * working when the matcher doesn't.
 *
 * **Why a redirect and not a cookie-clearing response**: Next cannot set
 * cookies during an RSC render. A revoked session therefore can't be terminated
 * in place here; it is sent to `/api/session/terminate`, a route handler that
 * CAN clear the cookie and then forwards to sign-in.
 */

export type PageGuardOptions = {
  locale?: string | undefined;
  /**
   * Where to send the user back to after signing in. Server components can't
   * read their own pathname, so callers that care pass it explicitly. Omitting
   * it just lands the user on the section root — a nicety, not a gate.
   */
  next?: string | undefined;
};

const isLocale = (value: string | undefined): value is Locale =>
  !!value && (routing.locales as readonly string[]).includes(value);

const resolveLocale = (locale?: string): Locale =>
  isLocale(locale) ? locale : routing.defaultLocale;

const signInUrl = (locale: Locale, next?: string): string => {
  const params = new URLSearchParams();
  if (next && next !== '/') params.set('next', next);
  const qs = params.toString();
  return `/${locale}/signin${qs ? `?${qs}` : ''}`;
};

/**
 * Route a request holding a dead-but-well-formed token through the terminate
 * handler so the cookie actually goes away. Looping such a user straight back
 * through Google would just mint another token for the same dead account.
 */
const terminateUrl = (locale: Locale, reason: string, next?: string): string => {
  const params = new URLSearchParams({ locale, reason });
  if (next && next !== '/') params.set('next', next);
  return `/api/session/terminate?${params.toString()}`;
};

async function failureReason(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as { error?: { reason?: string } };
    return body.error?.reason ?? 'session_expired';
  } catch {
    return 'session_expired';
  }
}

/** Authenticated user, or a redirect. Never returns for an invalid session. */
export async function requireUserPage(options: PageGuardOptions = {}): Promise<AuthUser> {
  const result = await requireUser();
  if (result.ok) return result.user;

  const locale = resolveLocale(options.locale);
  const reason = await failureReason(result.response);
  // Casts: `typedRoutes` can't narrow a runtime-computed path. Neither builder
  // interpolates user input beyond the `next` value, which the sign-in page
  // re-validates as same-origin before using it.
  if (reason === 'unauthenticated') redirect(signInUrl(locale, options.next) as Route);
  redirect(terminateUrl(locale, reason, options.next) as Route);
}

export async function requireAdminPage(options: PageGuardOptions = {}): Promise<AuthUser> {
  // Break-glass first: the whole point of the mechanism is that it works when
  // the OAuth path doesn't, so it must not depend on a session lookup.
  const breakGlass = await readBreakGlassUser();
  if (breakGlass) return breakGlass;

  const user = await requireUserPage(options);
  if (user.role !== 'admin') {
    // Authenticated but not an admin: 404 is the right answer. Redirecting to
    // sign-in would loop a perfectly valid session forever, and a 403 page
    // confirms the admin panel exists at this path.
    notFound();
  }
  return user;
}

export async function requireHostPage(options: PageGuardOptions = {}): Promise<AuthUser> {
  const user = await requireUserPage(options);
  if (!user.becameHostAt && user.role !== 'admin') {
    redirect(`/${resolveLocale(options.locale)}/host/start` as Route);
  }
  return user;
}
