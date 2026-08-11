import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeCronRequest } from './cron-auth';

const SECRET = 'a-long-enough-cron-secret-value';

const req = (headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/cron/bookings', { headers });

beforeEach(() => vi.stubEnv('CRON_SECRET', SECRET));
afterEach(() => vi.unstubAllEnvs());

describe('authorizeCronRequest', () => {
  it('accepts the configured bearer token', () => {
    expect(authorizeCronRequest(req({ authorization: `Bearer ${SECRET}` }))).toEqual({ ok: true });
  });

  it('rejects a wrong token of the SAME length', () => {
    const wrong = 'b'.repeat(SECRET.length);
    expect(authorizeCronRequest(req({ authorization: `Bearer ${wrong}` })).ok).toBe(false);
  });

  /**
   * `timingSafeEqual` throws outright on length-mismatched inputs, and the
   * usual workaround — returning early when lengths differ — leaks the secret's
   * length through timing. Hashing both sides to 32 bytes first means a short
   * token is answered the same way as a wrong one, with no throw.
   */
  it('rejects tokens of a different length without throwing', () => {
    for (const wrong of ['x', 'short', SECRET + 'extra', 'y'.repeat(500)]) {
      expect(() => authorizeCronRequest(req({ authorization: `Bearer ${wrong}` }))).not.toThrow();
      expect(authorizeCronRequest(req({ authorization: `Bearer ${wrong}` })).ok).toBe(false);
    }
  });

  it('rejects a missing or malformed Authorization header', () => {
    expect(authorizeCronRequest(req()).ok).toBe(false);
    expect(authorizeCronRequest(req({ authorization: SECRET })).ok).toBe(false);
    expect(authorizeCronRequest(req({ authorization: 'Basic abc' })).ok).toBe(false);
    expect(authorizeCronRequest(req({ authorization: 'Bearer ' })).ok).toBe(false);
  });

  it('is case-sensitive about the scheme, and about the token', () => {
    expect(authorizeCronRequest(req({ authorization: `bearer ${SECRET}` })).ok).toBe(false);
    expect(authorizeCronRequest(req({ authorization: `Bearer ${SECRET.toUpperCase()}` })).ok).toBe(
      false,
    );
  });

  describe('fails closed', () => {
    it('refuses with 503 when CRON_SECRET is unset', () => {
      vi.stubEnv('CRON_SECRET', '');
      const result = authorizeCronRequest(req({ authorization: 'Bearer anything' }));
      // An unauthenticated endpoint that expires other people's bookings is
      // worse than one that never runs: a silent no-op shows up in the
      // heartbeat, a silent open door does not.
      expect(result).toEqual({ ok: false, status: 503, message: 'CRON_SECRET is not configured' });
    });

    it('refuses a suspiciously short secret rather than trusting it', () => {
      vi.stubEnv('CRON_SECRET', 'tiny');
      expect(authorizeCronRequest(req({ authorization: 'Bearer tiny' })).ok).toBe(false);
    });
  });

  it('answers 401 — not 403 — for a bad token', () => {
    const result = authorizeCronRequest(req({ authorization: 'Bearer nope' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });
});
