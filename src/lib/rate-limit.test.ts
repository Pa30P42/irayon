import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, getClientIp, resetRateLimitStore } from './rate-limit';

afterEach(() => {
  resetRateLimitStore();
  vi.useRealTimers();
});

describe('checkRateLimit', () => {
  it('allows up to the bucket limit, then rejects', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('adminLogin', '1.2.3.4').success).toBe(true);
    }
    expect(checkRateLimit('adminLogin', '1.2.3.4').success).toBe(false);
  });

  it('tracks keys independently', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('adminLogin', '1.2.3.4');
    expect(checkRateLimit('adminLogin', '1.2.3.4').success).toBe(false);
    expect(checkRateLimit('adminLogin', '5.6.7.8').success).toBe(true);
  });

  it('tracks buckets independently for the same key', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('adminLogin', '1.2.3.4');
    expect(checkRateLimit('adminLogin', '1.2.3.4').success).toBe(false);
    expect(checkRateLimit('calls', '1.2.3.4').success).toBe(true);
  });

  it('resets after the window elapses', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 6; i++) checkRateLimit('adminLogin', '1.2.3.4');
    expect(checkRateLimit('adminLogin', '1.2.3.4').success).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit('adminLogin', '1.2.3.4').success).toBe(true);
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
