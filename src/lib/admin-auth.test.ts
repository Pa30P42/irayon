import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { requireAdmin } from './admin-auth';
import { ADMIN_SESSION_COOKIE, signAdminSession } from './admin-session';

const ORIGINAL_ENV = { ...process.env };

const mkRequest = (cookie?: string): Request =>
  new Request('http://localhost/admin/test', {
    headers: cookie ? { cookie } : {},
  });

beforeEach(() => {
  process.env.ADMIN_LOGIN = 'admin';
  process.env.ADMIN_PASSWORD = 'hunter2';
  process.env.ADMIN_SESSION_SECRET = 'a'.repeat(32);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('requireAdmin', () => {
  it('allows requests carrying a valid signed session cookie', async () => {
    const session = await signAdminSession();
    expect(session).not.toBeNull();
    const result = await requireAdmin(mkRequest(`${ADMIN_SESSION_COOKIE}=${session!.token}`));
    expect(result.ok).toBe(true);
  });

  it('rejects when no cookie is sent', async () => {
    const result = await requireAdmin(mkRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('rejects when the cookie value is tampered', async () => {
    const session = await signAdminSession();
    const tampered = session!.token.slice(0, -2) + 'aa';
    const result = await requireAdmin(mkRequest(`${ADMIN_SESSION_COOKIE}=${tampered}`));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('rejects when the token has expired', async () => {
    // Re-sign with a clock 30 days in the past so the embedded expiry < now.
    const past = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const session = await signAdminSession(past);
    const result = await requireAdmin(mkRequest(`${ADMIN_SESSION_COOKIE}=${session!.token}`));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('returns 503 when admin credentials are not configured', async () => {
    delete process.env.ADMIN_LOGIN;
    const session = await signAdminSession();
    const result = await requireAdmin(mkRequest(`${ADMIN_SESSION_COOKIE}=${session!.token}`));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });

  it('returns 503 when ADMIN_SESSION_SECRET is missing or too short', async () => {
    process.env.ADMIN_SESSION_SECRET = 'too-short';
    const result = await requireAdmin(mkRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });
});
