import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.fn();
vi.mock('@/auth', () => ({ auth: () => authMock() }));

const findUniqueUser = vi.fn();
const findFirstListing = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueUser(...args) },
    listing: { findFirst: (...args: unknown[]) => findFirstListing(...args) },
  },
}));

const verifyAdminSessionMock = vi.fn();
vi.mock('@/lib/admin-session', () => ({
  ADMIN_SESSION_COOKIE: 'irayon_admin_session',
  verifyAdminSession: (...args: unknown[]) => verifyAdminSessionMock(...args),
}));

import {
  expiredSessionCookie,
  requireAdmin,
  requireHost,
  requireListingOwner,
  requireSameOrigin,
  requireUser,
} from './auth-helpers';

const dbUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'u1',
  email: 'host@example.com',
  name: 'Host',
  image: null,
  role: 'USER' as const,
  preferredLocale: 'az',
  becameHostAt: null,
  suspendedAt: null,
  sessionVersion: 0,
  ...overrides,
});

const session = (overrides: Record<string, unknown> = {}) => ({
  user: { id: 'u1', role: 'user', sessionVersion: 0, ...overrides },
});

beforeEach(() => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  vi.stubEnv('ADMIN_BREAK_GLASS', 'false');
  authMock.mockReset();
  findUniqueUser.mockReset();
  findFirstListing.mockReset();
  verifyAdminSessionMock.mockReset();
});

const readReason = async (response: Response): Promise<string | undefined> => {
  const body = (await response.json()) as { error?: { reason?: string } };
  return body.error?.reason;
};

describe('requireUser', () => {
  it('returns the user when the token matches the database row', async () => {
    authMock.mockResolvedValue(session());
    findUniqueUser.mockResolvedValue(dbUser());

    const result = await requireUser();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user).toMatchObject({ id: 'u1', role: 'user' });
  });

  it('rejects an unauthenticated caller without hitting the database', async () => {
    authMock.mockResolvedValue(null);
    const result = await requireUser();
    expect(result.ok).toBe(false);
    expect(findUniqueUser).not.toHaveBeenCalled();
  });

  it('terminates the session when sessionVersion no longer matches (revoked)', async () => {
    authMock.mockResolvedValue(session({ sessionVersion: 3 }));
    findUniqueUser.mockResolvedValue(dbUser({ sessionVersion: 4 }));

    const result = await requireUser();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    // The point of the design: the cookie is EXPIRED, not merely refused.
    // Leaving it in place would make every later request fail identically,
    // forever, with no way for the user to recover.
    expect(result.response.headers.get('set-cookie')).toMatch(/Max-Age=0/);
    await expect(readReason(result.response)).resolves.toBe('session_expired');
  });

  it('terminates the session for a suspended user, with a distinct reason', async () => {
    authMock.mockResolvedValue(session());
    findUniqueUser.mockResolvedValue(dbUser({ suspendedAt: new Date() }));

    const result = await requireUser();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.headers.get('set-cookie')).toMatch(/Max-Age=0/);
    // Distinct from `session_expired` so the sign-in page can say why instead
    // of looping a suspended user through Google forever.
    await expect(readReason(result.response)).resolves.toBe('suspended');
  });

  it('terminates the session when the user row no longer exists', async () => {
    authMock.mockResolvedValue(session());
    findUniqueUser.mockResolvedValue(null);

    const result = await requireUser();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.headers.get('set-cookie')).toMatch(/Max-Age=0/);
  });

  it('trusts the DATABASE role, not the token claim', async () => {
    // A token forged/stale with role: admin must not grant admin.
    authMock.mockResolvedValue(session({ role: 'admin' }));
    findUniqueUser.mockResolvedValue(dbUser({ role: 'USER' }));

    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });
});

describe('requireAdmin', () => {
  it('allows a database admin', async () => {
    authMock.mockResolvedValue(session({ role: 'admin' }));
    findUniqueUser.mockResolvedValue(dbUser({ role: 'ADMIN' }));

    const result = await requireAdmin();
    expect(result.ok).toBe(true);
  });

  it('answers 403 (not 401) for an authenticated non-admin, leaving their cookie alone', async () => {
    authMock.mockResolvedValue(session());
    findUniqueUser.mockResolvedValue(dbUser());

    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(403);
    expect(result.response.headers.get('set-cookie')).toBeNull();
  });

  it('ignores a valid break-glass cookie while ADMIN_BREAK_GLASS is off', async () => {
    verifyAdminSessionMock.mockResolvedValue(true);
    authMock.mockResolvedValue(null);

    const request = new Request('http://localhost/api/admin/listings', {
      headers: { cookie: 'irayon_admin_session=valid.token' },
    });
    const result = await requireAdmin(request);
    expect(result.ok).toBe(false);
    // Disarming the feature must invalidate cookies already issued — otherwise
    // "turn it off" wouldn't actually close the door.
    expect(verifyAdminSessionMock).not.toHaveBeenCalled();
  });

  it('accepts a valid break-glass cookie when armed', async () => {
    vi.stubEnv('ADMIN_BREAK_GLASS', 'true');
    verifyAdminSessionMock.mockResolvedValue(true);

    const request = new Request('http://localhost/api/admin/listings', {
      headers: { cookie: 'irayon_admin_session=valid.token' },
    });
    const result = await requireAdmin(request);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.breakGlass).toBe(true);
    // No session lookup at all — break-glass exists precisely for when the
    // OAuth path is unavailable.
    expect(authMock).not.toHaveBeenCalled();
  });
});

describe('requireHost', () => {
  it('rejects a user who has never created a listing', async () => {
    authMock.mockResolvedValue(session());
    findUniqueUser.mockResolvedValue(dbUser({ becameHostAt: null }));

    const result = await requireHost();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it('allows a user with becameHostAt set', async () => {
    authMock.mockResolvedValue(session());
    findUniqueUser.mockResolvedValue(dbUser({ becameHostAt: new Date() }));

    await expect(requireHost().then((r) => r.ok)).resolves.toBe(true);
  });

  it('allows an admin who is not yet a host', async () => {
    authMock.mockResolvedValue(session({ role: 'admin' }));
    findUniqueUser.mockResolvedValue(dbUser({ role: 'ADMIN', becameHostAt: null }));

    await expect(requireHost().then((r) => r.ok)).resolves.toBe(true);
  });
});

describe('requireListingOwner', () => {
  it('scopes the lookup by hostId and answers 404 — never 403 — when it misses', async () => {
    authMock.mockResolvedValue(session());
    findUniqueUser.mockResolvedValue(dbUser({ becameHostAt: new Date() }));
    findFirstListing.mockResolvedValue(null);

    const result = await requireListingOwner('lst_someone_elses');
    expect(result.ok).toBe(false);
    // 403 would confirm the id exists — an enumeration oracle over private rows.
    if (!result.ok) expect(result.response.status).toBe(404);
    expect(findFirstListing).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lst_someone_elses', hostId: 'u1' },
      }),
    );
  });

  it('lets an admin through without an ownership predicate', async () => {
    authMock.mockResolvedValue(session({ role: 'admin' }));
    findUniqueUser.mockResolvedValue(dbUser({ role: 'ADMIN' }));
    findFirstListing.mockResolvedValue({ id: 'lst1', slug: 'a', hostId: 'someone-else' });

    const result = await requireListingOwner('lst1');
    expect(result.ok).toBe(true);
    expect(findFirstListing).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lst1' } }),
    );
  });
});

describe('requireSameOrigin', () => {
  const req = (headers: Record<string, string>) =>
    new Request('http://localhost/api/host/listings', { method: 'POST', headers });

  it('allows same-origin fetches', () => {
    expect(requireSameOrigin(req({ 'sec-fetch-site': 'same-origin' }))).toBeNull();
  });

  it('allows direct navigations (Sec-Fetch-Site: none)', () => {
    expect(requireSameOrigin(req({ 'sec-fetch-site': 'none' }))).toBeNull();
  });

  it('refuses cross-site requests', () => {
    const response = requireSameOrigin(req({ 'sec-fetch-site': 'cross-site' }));
    expect(response?.status).toBe(403);
  });

  it('falls back to comparing Origin against Host', () => {
    expect(requireSameOrigin(req({ origin: 'http://localhost', host: 'localhost' }))).toBeNull();
    expect(
      requireSameOrigin(req({ origin: 'http://evil.example', host: 'localhost' }))?.status,
    ).toBe(403);
  });

  it('allows requests with neither header (server-to-server tooling)', () => {
    expect(requireSameOrigin(req({}))).toBeNull();
  });
});

describe('expiredSessionCookie', () => {
  it('expires the cookie with attributes a __Host- cookie would accept', () => {
    const cookie = expiredSessionCookie();
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=0/);
    expect(cookie).toMatch(/HttpOnly/);
  });
});
