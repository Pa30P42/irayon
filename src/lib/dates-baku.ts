import { TZDate } from '@date-fns/tz';

/**
 * Date handling for bookings, pinned to Azerbaijan's civil time.
 *
 * **Why a real IANA zone and not a hardcoded `+4`.** Azerbaijan abolished DST
 * in 2016 *by policy*, and policies reverse — Turkey, Russia, Chile and others
 * have all changed their minds within the last decade. A hardcoded offset is a
 * latent bug that costs an hour on some future spring morning, in the one part
 * of the system where being a day out means a guest arrives to a locked gate.
 * `@date-fns/tz` reads the real zone database; date-fns 4 is already a
 * dependency, so this needs no `date-fns-tz` addition (whose `zonedTimeToUtc`
 * is a v2 name anyway — v3 renamed it `fromZonedTime`).
 *
 * **Two representations, deliberately kept apart:**
 *
 *   - a CALENDAR DATE (`2026-08-11`) — what a `@db.Date` column stores and what
 *     "check in on the 11th" means. Represented as a `Date` at UTC midnight,
 *     which is exactly how Prisma serialises a `DATE`.
 *   - an INSTANT — a point on the timeline, used for expiry math.
 *
 * Mixing them is the classic source of off-by-one-day bugs, so the names here
 * always say which one you're getting.
 */

export const BAKU_TZ = 'Asia/Baku';

/** A calendar date with no time and no zone. */
export type CalendarDate = { year: number; month: number; day: number };

/**
 * Canonical representation of a calendar date for a `@db.Date` column: UTC
 * midnight. Never construct these with `new Date('2026-08-11')` at a call
 * site — that parses as UTC in some engines and local in others.
 */
export function toDateOnly({ year, month, day }: CalendarDate): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function fromDateOnly(date: Date): CalendarDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** Today's calendar date *in Baku*, which is not necessarily today in UTC. */
export function todayInBaku(now: Date = new Date()): CalendarDate {
  const zoned = new TZDate(now.getTime(), BAKU_TZ);
  return { year: zoned.getFullYear(), month: zoned.getMonth() + 1, day: zoned.getDate() };
}

/** Today in Baku, as a `@db.Date`-shaped value. */
export const todayInBakuDateOnly = (now: Date = new Date()): Date => toDateOnly(todayInBaku(now));

/**
 * The INSTANT at which a given calendar date begins in Baku.
 *
 * `startOfDayBaku({2026, 8, 11})` is 2026-08-10T20:00:00Z while the offset is
 * +4 — and would be something else if the offset ever changed, which is the
 * whole reason this goes through the zone database.
 */
export function startOfDayBaku(date: CalendarDate): Date {
  const zoned = new TZDate(date.year, date.month - 1, date.day, 0, 0, 0, 0, BAKU_TZ);
  return new Date(zoned.getTime());
}

/** Nights between two calendar dates, half-open `[checkIn, checkOut)`. */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const MS_PER_DAY = 86_400_000;
  // Both are UTC-midnight values, so this is exact integer arithmetic — no DST
  // to skew it, because neither value carries a zone at all.
  return Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);
}

/** True when `date` is strictly before today in Baku. */
export function isPastInBaku(date: Date, now: Date = new Date()): boolean {
  return date.getTime() < todayInBakuDateOnly(now).getTime();
}

/** Host response window, and the floor below which it must never fall. */
export const BOOKING_EXPIRY_MAX_MS = 24 * 60 * 60 * 1000;
export const BOOKING_EXPIRY_FLOOR_MS = 2 * 60 * 60 * 1000;

/**
 * When a pending request stops waiting for the host.
 *
 *   `max(now + 2h, min(now + 24h, startOfDayBaku(checkIn)))`
 *
 * The inner `min` stops a request from outliving the stay it is asking for —
 * accepting a booking after check-in has already begun is meaningless.
 *
 * **The 2-hour floor is the part that matters.** Without it, a same-day request
 * is born already expired (check-in started this morning, so the inner term is
 * in the past) and the next hourly cron sweep kills it before the host has even
 * seen it. The host always gets a minimum window to respond, even if that
 * window extends past the requested check-in.
 */
export function bookingExpiresAt(checkIn: Date, now: Date = new Date()): Date {
  const checkInStart = startOfDayBaku(fromDateOnly(checkIn)).getTime();
  const capped = Math.min(now.getTime() + BOOKING_EXPIRY_MAX_MS, checkInStart);
  return new Date(Math.max(now.getTime() + BOOKING_EXPIRY_FLOOR_MS, capped));
}
