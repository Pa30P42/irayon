/**
 * Minimal fixed-window rate limiter, in-memory per server instance.
 *
 * Good enough for a single-region deployment (`vercel.json` pins functions to
 * `hnd1`): each warm lambda keeps its own counters, so the effective global
 * limit is `limit × concurrent instances` — still a hard brake on brute-force
 * against the admin login and on call-event spam. Swap the Map for Upstash
 * (see emlak-uz `src/lib/rate-limit.ts`) if multi-region or exact limits are
 * ever needed.
 */

export type RateLimitBucket = 'adminLogin' | 'calls';

const BUCKETS: Record<RateLimitBucket, { limit: number; windowMs: number }> = {
  // Strict: 5 attempts / minute / IP against the plaintext-credential login.
  adminLogin: { limit: 5, windowMs: 60_000 },
  // Loose: 30 call-click events / minute / IP.
  calls: { limit: 30, windowMs: 60_000 },
};

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Drop expired windows so the Map doesn't grow unbounded on a warm instance. */
function sweep(now: number): void {
  if (windows.size < 1_000) return;
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = {
  /** True when the request is allowed. */
  success: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Window resets at this epoch-ms. */
  reset: number;
  /** Configured request cap for the bucket. */
  limit: number;
};

export function checkRateLimit(bucket: RateLimitBucket, key: string): RateLimitResult {
  const { limit, windowMs } = BUCKETS[bucket];
  const now = Date.now();
  sweep(now);

  const mapKey = `${bucket}:${key}`;
  const current = windows.get(mapKey);
  if (!current || current.resetAt <= now) {
    windows.set(mapKey, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs, limit };
  }

  current.count += 1;
  return {
    success: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    reset: current.resetAt,
    limit,
  };
}

/**
 * Platform-trusted client IP for rate-limiting purposes.
 *
 * A caller can send an arbitrary `x-forwarded-for` header, so the value is
 * only trustworthy where a trusted proxy overwrites or appends to it. On
 * Vercel the edge sets `x-real-ip` to the authoritative client IP and appends
 * the real client as the LAST token of `x-forwarded-for` — so prefer
 * `x-real-ip`, then the RIGHTMOST `x-forwarded-for` token. Never the leftmost:
 * that one is fully attacker-controlled and would let anyone reset their own
 * bucket by spoofing the header.
 */
export function getClientIp(request: Request): string {
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',');
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }
  return 'unknown';
}

/**
 * Standard headers for a rate-limit response. Apply to both success and 429
 * responses so clients can self-throttle.
 */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(r.reset),
  };
}

/** Test-only: reset all counters between cases. */
export function resetRateLimitStore(): void {
  windows.clear();
}
