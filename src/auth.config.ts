import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * EDGE-SAFE Auth.js configuration.
 *
 * Nothing in this file may import Prisma, `node:` builtins, or anything that
 * transitively does — `src/middleware.ts` runs on the edge runtime and cannot
 * open a database connection through pgbouncer. The Prisma adapter, the
 * DB-reading callbacks, and the dev-only provider all live in `src/auth.ts`.
 */

const isProd = process.env.NODE_ENV === 'production';

/**
 * `__Host-` in production is the strongest binding the platform offers: the
 * cookie is committed to the exact origin, must be Secure, must have Path=/,
 * and must carry no Domain — so no subdomain can overwrite it and no downgrade
 * can strip Secure. In dev (http://) the plain name is used or the browser
 * would reject the cookie outright.
 *
 * Exported because three places must agree on it: the Auth.js config, the
 * middleware's `getToken` call, and the `Set-Cookie` that terminates a session.
 */
export const SESSION_COOKIE_NAME = isProd ? '__Host-irayon_session' : 'irayon_session';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: isProd,
} as const;

/** 30 days, refreshed at most once a day. */
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const SESSION_UPDATE_AGE = 24 * 60 * 60;

/**
 * Google is the only real provider. It is registered only when credentials
 * exist so that a deployment without them starts cleanly and simply shows no
 * Google button, rather than crashing at config time.
 */
const googleProvider =
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          // Deliberately NOT `allowDangerousEmailAccountLinking`. It is safe
          // only while Google is the sole provider and becomes an
          // account-takeover vector the day a second one lands. The admin
          // signs in first; the backfill script then promotes that row.
          allowDangerousEmailAccountLinking: false,
        }),
      ]
    : [];

export const authConfig = {
  providers: googleProvider,
  session: {
    // JWT, not database sessions: edge middleware can't run Prisma through
    // pgbouncer, and JWT verification is Web-Crypto-only — so the gate stays
    // DB-free and fail-closed. The `sessions` table exists anyway so switching
    // strategies later is config, not a migration.
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  cookies: {
    sessionToken: { name: SESSION_COOKIE_NAME, options: SESSION_COOKIE_OPTIONS },
  },
  pages: {
    // Not locale-prefixed: next-intl's middleware redirects `/signin` to
    // `/{defaultLocale}/signin`, and our own gates build a locale-correct URL
    // before ever handing off to Auth.js.
    signIn: '/signin',
    error: '/signin',
  },
  trustHost: true,
} satisfies NextAuthConfig;
