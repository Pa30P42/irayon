import { auth } from '@/auth';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/auth.config';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import type { Redis as UpstashRedis } from '@upstash/redis';
import { cache } from 'react';

/**
 * Server-side authorization gates. Successor to `admin-auth.ts`; the result
 * shape is deliberately identical (`{ok:true,user} | {ok:false,response}`) so
 * migrating the existing admin handlers is mechanical.
 *
 * The division of labour:
 *   - middleware is OPTIMISTIC — it reads the JWT, decides whether a request
 *     may reach the server at all, and never touches the database;
 *   - these helpers are STRICT — they re-read `role`, `sessionVersion` and
 *     `suspendedAt` from the database, so a revoked or suspended user cannot
 *     outlive their token.
 *
 * A failed strict check TERMINATES the session rather than merely refusing the
 * request. A 401 that leaves the cookie in place isn't a sign-out, it's a
 * permanently broken page: every subsequent request re-presents the same dead
 * token and fails the same way, forever.
 */

export type SessionRole = 'user' | 'admin';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: SessionRole;
  preferredLocale: string;
  /** Non-null once the user has created their first listing — "is a host". */
  becameHostAt: Date | null;
  sessionVersion: number;
  /** True when the caller authenticated via the break-glass credential login. */
  breakGlass: boolean;
};

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; response: Response };

/** Machine-readable reasons, surfaced on the sign-in page as distinct copy. */
export type InvalidSessionReason = 'session_expired' | 'suspended' | 'unauthenticated';

const jsonError = (
  status: number,
  message: string,
  extra: Record<string, unknown> = {},
): Response =>
  new Response(JSON.stringify({ error: { message, ...extra } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/**
 * `Set-Cookie` that expires the session cookie, matching name and attributes
 * exactly (a `__Host-` cookie can only be overwritten by another `__Host-`
 * compliant cookie: Secure, Path=/, no Domain).
 */
export function expiredSessionCookie(): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (SESSION_COOKIE_OPTIONS.secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * 401 + a cookie-clearing header. Used for the three cases where the token is
 * syntactically valid but no longer means anything: `sv` mismatch (revoked),
 * `suspendedAt` set, and a user row that no longer exists.
 */
export function invalidSession(reason: InvalidSessionReason): Response {
  const response = jsonError(401, 'Authentication required', { reason });
  response.headers.append('set-cookie', expiredSessionCookie());
  return response;
}

// ---------------------------------------------------------------------------
// Strict check + caching
// ---------------------------------------------------------------------------

type StrictRow = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: 'USER' | 'ADMIN';
  preferredLocale: string;
  becameHostAt: Date | null;
  suspendedAt: Date | null;
  sessionVersion: number;
};

const STRICT_SELECT = {
  id: true,
  email: true,
  name: true,
  image: true,
  role: true,
  preferredLocale: true,
  becameHostAt: true,
  suspendedAt: true,
  sessionVersion: true,
} as const;

/** Upstash TTL for the strict check. See the bound documented on `readUser`. */
const SESSION_CACHE_TTL_SECONDS = 60;

const cacheKey = (userId: string): string => `sess:${userId}`;

type CachedRow = Omit<StrictRow, 'becameHostAt' | 'suspendedAt'> & {
  becameHostAt: string | null;
  suspendedAt: string | null;
};

const serialize = (row: StrictRow): CachedRow => ({
  ...row,
  becameHostAt: row.becameHostAt?.toISOString() ?? null,
  suspendedAt: row.suspendedAt?.toISOString() ?? null,
});

const deserialize = (row: CachedRow): StrictRow => ({
  ...row,
  becameHostAt: row.becameHostAt ? new Date(row.becameHostAt) : null,
  suspendedAt: row.suspendedAt ? new Date(row.suspendedAt) : null,
});

/**
 * Upstash Redis client, resolved once. `null` when the vars are absent — the
 * cache layer then simply doesn't exist and `React.cache()` carries the load
 * on its own, which is free and correct (just less effective across requests).
 */
let redisClient: UpstashRedis | null | undefined;

async function getRedis(): Promise<UpstashRedis | null> {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  const { Redis } = await import('@upstash/redis');
  redisClient = new Redis({ url, token });
  return redisClient;
}

/** Single-line JSON: decides whether the Upstash layer earns its place. */
function logCacheEvent(event: 'hit' | 'miss', ms: number): void {
  console.warn(JSON.stringify({ type: 'session_cache', at: new Date().toISOString(), event, ms }));
}

/**
 * Request-scoped dedupe. A single render can call `requireUser()` from a
 * layout, a page, and two server components; without this that is four
 * identical queries against a `connection_limit=5` pool.
 */
const readUserRequestScoped = cache(
  async (userId: string): Promise<StrictRow | null> =>
    prisma.user.findUnique({ where: { id: userId }, select: STRICT_SELECT }),
);

/**
 * Read the strict-check row.
 *
 * Two cache layers sit in front of the query: `React.cache()` (per request)
 * and an Upstash TTL (across requests). Mutations pass `force` and skip both.
 *
 * **Documented bound**: if the invalidating `DEL` on revoke/suspend fails,
 * enforcement is delayed by up to `SESSION_CACHE_TTL_SECONDS`. That is an
 * accepted property of this design, not an oversight — but it is the reason
 * `force` exists and why every mutation path uses it.
 */
async function readUser(userId: string, force: boolean): Promise<StrictRow | null> {
  if (force) {
    return prisma.user.findUnique({ where: { id: userId }, select: STRICT_SELECT });
  }

  const redis = await getRedis();
  if (!redis) return readUserRequestScoped(userId);

  const started = Date.now();
  try {
    const cached = await redis.get<CachedRow>(cacheKey(userId));
    if (cached) {
      logCacheEvent('hit', Date.now() - started);
      return deserialize(cached);
    }
  } catch {
    // A Redis blip must not sign everyone out — fall through to the DB.
  }

  const row = await readUserRequestScoped(userId);
  logCacheEvent('miss', Date.now() - started);
  if (row) {
    try {
      await redis.set(cacheKey(userId), serialize(row), { ex: SESSION_CACHE_TTL_SECONDS });
    } catch {
      // Cache writes are best-effort.
    }
  }
  return row;
}

/**
 * Drop the cached strict-check row. Call from every path that revokes or
 * suspends — the TTL is the backstop, not the mechanism.
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.del(cacheKey(userId));
  } catch {
    // See the documented bound on `readUser`.
  }
}

const toAuthUser = (row: StrictRow, breakGlass = false): AuthUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  image: row.image,
  role: row.role === 'ADMIN' ? 'admin' : 'user',
  preferredLocale: row.preferredLocale,
  becameHostAt: row.becameHostAt,
  sessionVersion: row.sessionVersion,
  breakGlass,
});

// ---------------------------------------------------------------------------
// Gates
// ---------------------------------------------------------------------------

export type RequireUserOptions = {
  /**
   * Skip both cache layers. Pass `true` from every mutation: a suspension that
   * takes effect on the next read but not on the next write is not a
   * suspension.
   */
  force?: boolean;
};

export async function requireUser(options: RequireUserOptions = {}): Promise<AuthResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, response: invalidSession('unauthenticated') };

  const row = await readUser(userId, options.force === true);

  // Row deleted out from under a live token.
  if (!row) return { ok: false, response: invalidSession('session_expired') };
  if (row.suspendedAt) return { ok: false, response: invalidSession('suspended') };
  // Revocation: the token's `sv` no longer matches the database.
  if (row.sessionVersion !== (session.user.sessionVersion ?? 0)) {
    return { ok: false, response: invalidSession('session_expired') };
  }

  return { ok: true, user: toAuthUser(row) };
}

/**
 * Reads the break-glass HMAC cookie from a raw `Request`. Kept separate from
 * the Auth.js session entirely — it grants admin capability without a user row.
 */
const readBreakGlassCookie = (request: Request): string | null => {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === ADMIN_SESSION_COOKIE) return rest.join('=');
  }
  return null;
};

export const isBreakGlassEnabled = (): boolean => process.env.ADMIN_BREAK_GLASS === 'true';

/**
 * Synthetic identity for a break-glass session. There is no user row — that is
 * the point: the mechanism has to work when the database-backed login path is
 * exactly what's broken. `id: null` semantics are carried by `breakGlass`, and
 * every AdminLog written under it records `adminId: null` +
 * `metadata.breakGlass: true`.
 */
export const breakGlassUser = (): AuthUser => ({
  id: BREAK_GLASS_USER_ID,
  email: process.env.ADMIN_EMAIL ?? 'break-glass@local',
  name: 'Break-glass admin',
  image: null,
  role: 'admin',
  preferredLocale: 'az',
  becameHostAt: null,
  sessionVersion: 0,
  breakGlass: true,
});

/** Sentinel id — never a real cuid, never written to a foreign key. */
export const BREAK_GLASS_USER_ID = 'break-glass';

/**
 * True when a valid break-glass cookie is present AND the mechanism is armed.
 * Disarming the feature must invalidate cookies already issued, so the env
 * check comes first.
 */
export async function hasBreakGlassSession(request: Request): Promise<boolean> {
  if (!isBreakGlassEnabled()) return false;
  return verifyAdminSession(readBreakGlassCookie(request));
}

/**
 * Admin gate. Accepts either a normal session whose database role is `admin`,
 * or a valid break-glass cookie — Google-only auth means an OAuth
 * misconfiguration or outage would otherwise lock the operator out of their own
 * platform.
 *
 * `request` is optional only because some callers (server components) have no
 * `Request` to hand; break-glass is unavailable on that path by construction.
 */
export async function requireAdmin(
  request?: Request,
  options: RequireUserOptions = {},
): Promise<AuthResult> {
  if (request && (await hasBreakGlassSession(request))) {
    console.warn(
      JSON.stringify({
        type: 'admin_break_glass_use',
        at: new Date().toISOString(),
        path: new URL(request.url).pathname,
      }),
    );
    return { ok: true, user: breakGlassUser() };
  }

  const result = await requireUser(options);
  if (!result.ok) return result;
  if (result.user.role !== 'admin') {
    // 403, not 401: the caller IS authenticated, they just aren't an admin.
    // Clearing their cookie here would sign a perfectly valid user out.
    return { ok: false, response: jsonError(403, 'Admin access required') };
  }
  return result;
}

/** Host gate — "host" is a capability, so this is a `becameHostAt` check. */
export async function requireHost(options: RequireUserOptions = {}): Promise<AuthResult> {
  const result = await requireUser(options);
  if (!result.ok) return result;
  if (!result.user.becameHostAt && result.user.role !== 'admin') {
    return { ok: false, response: jsonError(403, 'Host access required') };
  }
  return result;
}

export type ListingOwnerResult =
  | { ok: true; user: AuthUser; listing: { id: string; slug: string; hostId: string | null } }
  | { ok: false; response: Response };

/**
 * Ownership gate for a specific listing.
 *
 * Returns **404, not 403**, for a listing the caller doesn't own. A 403 is an
 * existence oracle: it tells an attacker that the id is real, which is enough
 * to enumerate the catalogue's private rows. Admins bypass ownership.
 */
export async function requireListingOwner(
  listingId: string,
  options: RequireUserOptions = {},
): Promise<ListingOwnerResult> {
  const result = await requireUser(options);
  if (!result.ok) return result;

  const listing = await prisma.listing.findFirst({
    where:
      result.user.role === 'admin' ? { id: listingId } : { id: listingId, hostId: result.user.id },
    select: { id: true, slug: true, hostId: true },
  });
  if (!listing) {
    return { ok: false, response: jsonError(404, 'Not found') };
  }
  return { ok: true, user: result.user, listing };
}

/**
 * CSRF defense for user-initiated mutations.
 *
 * Auth.js protects its own endpoints; everything else opts in here. `/api/cron/*`
 * is EXEMPT BY DESIGN — Vercel Cron issues a server-side request with neither
 * `Origin` nor `Sec-Fetch-Site`, so an origin check would 403 every invocation,
 * silently, inside a job nobody watches. Cron authenticates by bearer token.
 *
 * Returns `null` when the request is fine, or the 403 response to return.
 */
export function requireSameOrigin(request: Request): Response | null {
  // Modern browsers send this on every request and it cannot be forged by
  // script; when present it's the most reliable signal available.
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) {
    return fetchSite === 'same-origin' || fetchSite === 'none'
      ? null
      : jsonError(403, 'Cross-origin request refused');
  }

  // Fallback for clients that don't send Fetch Metadata: compare Origin to the
  // Host the request actually arrived on.
  const origin = request.headers.get('origin');
  if (!origin) {
    // No Origin and no Sec-Fetch-Site: not a browser form/fetch POST. Same-site
    // tooling (curl, tests) lands here; a cross-site browser attack does not.
    return null;
  }
  const host = request.headers.get('host');
  try {
    if (host && new URL(origin).host === host) return null;
  } catch {
    // Malformed Origin — treat as hostile.
  }
  return jsonError(403, 'Cross-origin request refused');
}
