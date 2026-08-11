import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Bearer authentication for `/api/cron/*`.
 *
 * **These endpoints are deliberately exempt from `requireSameOrigin`.** Vercel
 * Cron issues a server-side request with no `Origin` and no `Sec-Fetch-Site`,
 * so an origin check would 403 every single invocation — silently, inside a job
 * nobody is watching. The bearer token is the whole authentication story here.
 *
 * **Comparison is over SHA-256 DIGESTS, not the raw strings.** `timingSafeEqual`
 * throws outright when its inputs differ in length, and the usual workaround —
 * returning early on a length mismatch — leaks the secret's length through
 * timing. Hashing first makes both sides exactly 32 bytes, so the comparison is
 * always well-defined and always constant-time.
 */

const digest = (value: string): Buffer => createHash('sha256').update(value, 'utf8').digest();

export type CronAuthResult = { ok: true } | { ok: false; status: number; message: string };

export function authorizeCronRequest(request: Request): CronAuthResult {
  const secret = process.env.CRON_SECRET;

  // Fail CLOSED. An unauthenticated endpoint that expires other people's
  // bookings is worse than one that doesn't run — a silent no-op is visible in
  // the heartbeat, a silent open door is not.
  if (!secret || secret.length < 16) {
    return { ok: false, status: 503, message: 'CRON_SECRET is not configured' };
  }

  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!provided) return { ok: false, status: 401, message: 'Missing bearer token' };

  return timingSafeEqual(digest(provided), digest(secret))
    ? { ok: true }
    : { ok: false, status: 401, message: 'Invalid bearer token' };
}

/**
 * Ping an external absence-monitor (Healthchecks.io, Better Stack, …).
 *
 * The failure mode that actually matters for a cron is it silently NOT FIRING
 * — no error, no log line, nothing to alert on, just bookings quietly never
 * expiring. Only an external service noticing the absence of a ping catches
 * that. It also catches a 403 loop, if the origin exemption above were ever
 * regressed.
 *
 * Optional and best-effort: a monitoring outage must never fail the job.
 */
export async function pingHeartbeat(outcome: 'success' | 'fail' = 'success'): Promise<void> {
  const url = process.env.CRON_HEARTBEAT_URL;
  if (!url) return;
  try {
    await fetch(outcome === 'success' ? url : `${url}/fail`, {
      method: 'POST',
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Monitoring is not the job.
  }
}
