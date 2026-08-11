import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BOOKING_EXPIRY_FLOOR_MS,
  bookingExpiresAt,
  fromDateOnly,
  isPastInBaku,
  nightsBetween,
  startOfDayBaku,
  toDateOnly,
  todayInBaku,
} from './dates-baku';

/**
 * Every case here pins behaviour against a FIXED clock, and several run under a
 * deliberately non-Baku `TZ`. Without that, these tests would pass on a
 * developer's machine in Baku and fail in CI (UTC) — or worse, pass in both and
 * silently encode the machine's zone into the expectations.
 */
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const at = (iso: string) => new Date(iso);

describe('todayInBaku', () => {
  it('rolls over to the next day before UTC does', () => {
    // 21:00 UTC on the 10th is 01:00 on the 11th in Baku (+4).
    expect(todayInBaku(at('2026-08-10T21:00:00Z'))).toEqual({ year: 2026, month: 8, day: 11 });
  });

  it('is still yesterday in Baku just before the offset boundary', () => {
    expect(todayInBaku(at('2026-08-10T19:59:00Z'))).toEqual({ year: 2026, month: 8, day: 10 });
  });

  it('handles a year boundary', () => {
    expect(todayInBaku(at('2026-12-31T20:30:00Z'))).toEqual({ year: 2027, month: 1, day: 1 });
  });
});

describe('startOfDayBaku', () => {
  it('resolves a calendar date to the instant that day begins in Baku', () => {
    expect(startOfDayBaku({ year: 2026, month: 8, day: 11 }).toISOString()).toBe(
      '2026-08-10T20:00:00.000Z',
    );
  });

  it('gives the same answer whatever the machine TZ is', () => {
    // The zone database is the authority — not the host's clock.
    const expected = '2026-08-10T20:00:00.000Z';
    for (const tz of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      vi.stubEnv('TZ', tz);
      expect(startOfDayBaku({ year: 2026, month: 8, day: 11 }).toISOString()).toBe(expected);
    }
  });
});

describe('toDateOnly / fromDateOnly', () => {
  it('round-trips through UTC midnight, which is how Prisma stores DATE', () => {
    const d = toDateOnly({ year: 2026, month: 8, day: 11 });
    expect(d.toISOString()).toBe('2026-08-11T00:00:00.000Z');
    expect(fromDateOnly(d)).toEqual({ year: 2026, month: 8, day: 11 });
  });
});

describe('nightsBetween', () => {
  it('counts half-open nights', () => {
    expect(
      nightsBetween(
        toDateOnly({ year: 2026, month: 8, day: 11 }),
        toDateOnly({ year: 2026, month: 8, day: 14 }),
      ),
    ).toBe(3);
  });

  it('is exact across a month boundary', () => {
    expect(
      nightsBetween(
        toDateOnly({ year: 2026, month: 8, day: 30 }),
        toDateOnly({ year: 2026, month: 9, day: 2 }),
      ),
    ).toBe(3);
  });

  it('counts zero for the same day', () => {
    const d = toDateOnly({ year: 2026, month: 8, day: 11 });
    expect(nightsBetween(d, d)).toBe(0);
  });
});

describe('isPastInBaku', () => {
  it('uses the Baku calendar day, not the UTC one', () => {
    const now = at('2026-08-10T21:00:00Z'); // already the 11th in Baku
    expect(isPastInBaku(toDateOnly({ year: 2026, month: 8, day: 10 }), now)).toBe(true);
    expect(isPastInBaku(toDateOnly({ year: 2026, month: 8, day: 11 }), now)).toBe(false);
  });
});

describe('bookingExpiresAt', () => {
  it('caps the window at 24h for a distant check-in', () => {
    const now = at('2026-08-11T09:00:00Z');
    const checkIn = toDateOnly({ year: 2026, month: 12, day: 1 });
    expect(bookingExpiresAt(checkIn, now).toISOString()).toBe('2026-08-12T09:00:00.000Z');
  });

  it('never outlives the start of the stay itself', () => {
    // Check-in tomorrow: the window ends when the stay begins, not 24h out.
    const now = at('2026-08-11T09:00:00Z');
    const checkIn = toDateOnly({ year: 2026, month: 8, day: 12 });
    expect(bookingExpiresAt(checkIn, now).toISOString()).toBe('2026-08-11T20:00:00.000Z');
  });

  /**
   * The floor is the whole reason this function exists. Without it a same-day
   * request is born ALREADY EXPIRED — check-in began this morning, so the
   * capped term is in the past — and the next hourly cron sweep kills it
   * before the host has seen it.
   */
  it('gives the host at least 2 hours on a same-day request', () => {
    const now = at('2026-08-11T09:00:00Z'); // 13:00 in Baku, same day
    const checkIn = toDateOnly({ year: 2026, month: 8, day: 11 });
    const expires = bookingExpiresAt(checkIn, now);

    expect(expires.getTime()).toBeGreaterThan(now.getTime());
    expect(expires.getTime() - now.getTime()).toBe(BOOKING_EXPIRY_FLOOR_MS);
  });

  it('applies the floor even when check-in already started yesterday', () => {
    const now = at('2026-08-11T09:00:00Z');
    const checkIn = toDateOnly({ year: 2026, month: 8, day: 9 });
    expect(bookingExpiresAt(checkIn, now).getTime() - now.getTime()).toBe(BOOKING_EXPIRY_FLOOR_MS);
  });

  it('prefers the natural window when it is longer than the floor', () => {
    // Check-in tomorrow, 18 hours away — comfortably above the 2h floor.
    const now = at('2026-08-11T02:00:00Z');
    const checkIn = toDateOnly({ year: 2026, month: 8, day: 12 });
    const expires = bookingExpiresAt(checkIn, now);
    expect(expires.getTime() - now.getTime()).toBeGreaterThan(BOOKING_EXPIRY_FLOOR_MS);
    expect(expires.toISOString()).toBe('2026-08-11T20:00:00.000Z');
  });
});
