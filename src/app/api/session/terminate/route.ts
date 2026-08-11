import { routing } from '@/i18n/routing';
import { expiredSessionCookie, requireUser } from '@/lib/auth-helpers';
import { NextResponse } from 'next/server';

/**
 * Clears the session cookie and forwards to sign-in.
 *
 * Exists because Next cannot set cookies during an RSC render: a page-level
 * gate that discovers a revoked or suspended session can refuse the render but
 * cannot remove the dead cookie, so the user would be stuck re-presenting it
 * on every request forever. Page guards redirect here instead.
 *
 * **It re-runs the strict check before clearing anything.** That makes a GET
 * from an attacker's page a no-op for a valid session — a forced-logout CSRF,
 * mild as it is, isn't worth leaving open for no reason.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const requested = url.searchParams.get('locale');
  const locale = (routing.locales as readonly string[]).includes(requested ?? '')
    ? requested!
    : routing.defaultLocale;
  const reason = url.searchParams.get('reason') ?? 'session_expired';
  const next = url.searchParams.get('next');

  // `force` — never let a cached row decide whether to sign someone out.
  const result = await requireUser({ force: true });

  if (result.ok) {
    // Session is fine; nothing to terminate. Send them where they were going.
    return NextResponse.redirect(new URL(next || `/${locale}`, url.origin));
  }

  const target = new URL(`/${locale}/signin`, url.origin);
  target.searchParams.set('reason', reason);
  if (next) target.searchParams.set('next', next);

  const response = NextResponse.redirect(target);
  response.headers.append('set-cookie', expiredSessionCookie());
  response.headers.set('cache-control', 'private, no-store');
  return response;
}
