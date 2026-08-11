import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkRateLimit,
  getClientIp,
  isDurableRateLimiting,
  resetRateLimitStore,
} from './rate-limit';

beforeEach(() => {
  // The in-memory fallback is what these cases exercise; make sure a developer
  // with Upstash vars in their shell doesn't silently test the other backend.
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  resetRateLimitStore();
});

afterEach(() => {
  resetRateLimitStore();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('checkRateLimit', () => {
  it('falls back to the in-memory backend without Upstash env vars', () => {
    expect(isDurableRateLimiting()).toBe(false);
  });

  it('allows up to the bucket limit, then rejects', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await checkRateLimit('adminLogin', '1.2.3.4')).success).toBe(true);
    }
    expect((await checkRateLimit('adminLogin', '1.2.3.4')).success).toBe(false);
  });

  it('tracks keys independently', async () => {
    for (let i = 0; i < 5; i++) await checkRateLimit('adminLogin', '1.2.3.4');
    expect((await checkRateLimit('adminLogin', '1.2.3.4')).success).toBe(false);
    expect((await checkRateLimit('adminLogin', '5.6.7.8')).success).toBe(true);
  });

  it('tracks buckets independently for the same key', async () => {
    for (let i = 0; i < 5; i++) await checkRateLimit('adminLogin', '1.2.3.4');
    expect((await checkRateLimit('adminLogin', '1.2.3.4')).success).toBe(false);
    expect((await checkRateLimit('calls', '1.2.3.4')).success).toBe(true);
  });

  it('resets after the window elapses', async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 6; i++) await checkRateLimit('adminLogin', '1.2.3.4');
    expect((await checkRateLimit('adminLogin', '1.2.3.4')).success).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect((await checkRateLimit('adminLogin', '1.2.3.4')).success).toBe(true);
  });

  it('applies the per-user buckets added for the marketplace flows', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await checkRateLimit('listingCreate', 'user_1')).success).toBe(true);
    }
    expect((await checkRateLimit('listingCreate', 'user_1')).success).toBe(false);
    expect((await checkRateLimit('listingCreate', 'user_2')).success).toBe(true);
  });
});

describe('getClientIp', () => {
  const req = (headers: Record<string, string>) => new Request('http://localhost/', { headers });

  it('prefers x-real-ip', () => {
    expect(
      getClientIp(req({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' })),
    ).toBe('9.9.9.9');
  });

  it('falls back to the RIGHTMOST x-forwarded-for token (spoof-resistant)', () => {
    expect(getClientIp(req({ 'x-forwarded-for': 'spoofed, 2.2.2.2' }))).toBe('2.2.2.2');
  });

  it('returns "unknown" without headers', () => {
    expect(getClientIp(req({}))).toBe('unknown');
  });
});
