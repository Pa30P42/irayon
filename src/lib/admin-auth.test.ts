import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { requireAdmin } from './admin-auth';

const ORIGINAL_ENV = { ...process.env };

const basic = (user: string, pass: string): string =>
  `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

const mkRequest = (auth?: string): Request =>
  new Request('http://localhost/admin/test', {
    headers: auth ? { authorization: auth } : {},
  });

beforeEach(() => {
  process.env.ADMIN_LOGIN = 'admin';
  process.env.ADMIN_PASSWORD = 'hunter2';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('requireAdmin', () => {
  it('allows valid Basic credentials', () => {
    const result = requireAdmin(mkRequest(basic('admin', 'hunter2')));
    expect(result.ok).toBe(true);
  });

  it('rejects when no credentials are sent (with WWW-Authenticate)', () => {
    const result = requireAdmin(mkRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      expect(result.response.headers.get('www-authenticate')).toContain('Basic');
    }
  });

  it('rejects when the password is wrong', () => {
    const result = requireAdmin(mkRequest(basic('admin', 'wrong')));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('rejects when the username is wrong', () => {
    const result = requireAdmin(mkRequest(basic('hacker', 'hunter2')));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('rejects malformed Authorization headers', () => {
    const result = requireAdmin(mkRequest('Bearer abc.def.ghi'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('returns 503 when admin credentials are not configured', () => {
    delete process.env.ADMIN_LOGIN;
    const result = requireAdmin(mkRequest(basic('admin', 'hunter2')));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });
});
