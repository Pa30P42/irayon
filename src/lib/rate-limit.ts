/**
 * Rate limiting with two interchangeable backends behind one interface.
 *
 * - **Upstash Redis** (`@upstash/ratelimit`, sliding window) when
 *   `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set. Durable and
 *   exact across every lambda instance — the only correct answer once
 *   per-user buckets (bookings, messages, listing creates) exist.
 * - **In-memory fixed window** otherwise. Per-instance and therefore
 *   approximate, but it keeps dev, CI, and an un-provisioned deployment
 *   working instead of failing closed on a limiter.
 *
 * The backend is chosen once per process from env, so "connect Upstash later"
 * is purely an env change — no code path differs at the call site.
 *
 * Create the Upstash database in the SAME region as the deployment
 * (`ap-northeast-1`, matching the `hnd1` Vercel pin). From another region a
 * REST round-trip can cost more than the query it protects.
 */
import type { Duration } from '@upstash/ratelimit';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type RateLimitBucket =
  | 'adminLogin'
  | 'calls'
  | 'signin'
  | 'bookingCreate'
  | 'messageSend'
  | 'imageUpload'
  | 'listingCreate'
  | 'hostAction';

type BucketConfig = {
  limit: number;
  windowMs: number;
  /** Same window expressed for `@upstash/ratelimit`. Keep the two in sync. */
  window: Duration;
};

const BUCKETS: Record<RateLimitBucket, BucketConfig> = {
  // Strict: 5 attempts / minute / IP against the break-glass credential login.
  adminLogin: { limit: 5, windowMs: 60_000, window: '60 s' },
  // Loose: 30 call-click events / minute / IP.
  calls: { limit: 30, windowMs: 60_000, window: '60 s' },
  // OAuth sign-in kickoffs / minute / IP.
  signin: { limit: 10, windowMs: 60_000, window: '60 s' },
  // Per-user booking requests / hour.
  bookingCreate: { limit: 5, windowMs: 3_600_000, window: '1 h' },
  // Per-user messages / minute.
  messageSend: { limit: 20, windowMs: 60_000, window: '60 s' },
  // Per-user image uploads / hour.
  imageUpload: { limit: 30, windowMs: 3_600_000, window: '1 h' },
  // Per-user listing creates / day. Paired with the "one pending listing for
  // an unproven host" rule — free Google accounts make this weak on its own.
  listingCreate: { limit: 5, windowMs: 86_400_000, window: '1 d' },
  // Catch-all for host cabinet mutations / minute / user.
  hostAction: { limit: 60, windowMs: 60_000, window: '60 s' },
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

/**
 * Upstash limiters, one per bucket, built lazily and cached on the module.
 * `null` means "no Upstash configured" — resolved once, not per call.
 */
let upstashLimiters: Record<RateLimitBucket, Ratelimit> | null | undefined;

function getUpstashLimiters(): Record<RateLimitBucket, Ratelimit> | null {
  if (upstashLimiters !== undefined) return upstashLimiters;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    upstashLimiters = null;
    return null;
  }

  const redis = new Redis({ url, token });
  const entries = Object.entries(BUCKETS) as [RateLimitBucket, BucketConfig][];
  upstashLimiters = Object.fromEntries(
    entries.map(([bucket, cfg]) => [
      bucket,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(cfg.limit, cfg.window),
        prefix: `rl:${bucket}`,
        analytics: false,
      }),
    ]),
  ) as Record<RateLimitBucket, Ratelimit>;
  return upstashLimiters;
}

/** True when the durable backend is active — surfaced in health/debug output. */
export const isDurableRateLimiting = (): boolean => getUpstashLimiters() !== null;

function checkInMemory(bucket: RateLimitBucket, key: string): RateLimitResult {
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
 * Consume one token from `bucket` for `key`.
 *
 * Degrades **open** on an Upstash outage: a Redis blip must not take the
 * booking flow down with it. The degradation is loud — every fallback emits a
 * `rate_limit_backend_failed` line so the observability signal exists.
 */
export async function checkRateLimit(
  bucket: RateLimitBucket,
  key: string,
): Promise<RateLimitResult> {
  const limiters = getUpstashLimiters();
  let result: RateLimitResult;

  if (limiters) {
    try {
      const r = await limiters[bucket].limit(key);
      result = {
        success: r.success,
        remaining: r.remaining,
        reset: r.reset,
        limit: r.limit,
      };
    } catch (err) {
      console.warn(
        JSON.stringify({
          type: 'rate_limit_backend_failed',
          at: new Date().toISOString(),
          bucket,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      result = checkInMemory(bucket, key);
    }
  } else {
    result = checkInMemory(bucket, key);
  }

  if (!result.success) {
    // Machine-parseable, deliberately outside `logger` — this is an event
    // stream ("rejections by bucket"), not an error report.
    console.warn(
      JSON.stringify({
        type: 'rate_limit_rejected',
        at: new Date().toISOString(),
        bucket,
        durable: limiters !== null,
      }),
    );
  }

  return result;
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

/** Test-only: reset in-memory counters and the resolved backend between cases. */
export function resetRateLimitStore(): void {
  windows.clear();
  upstashLimiters = undefined;
}
