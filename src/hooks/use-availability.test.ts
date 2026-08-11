import { describe, expect, it } from 'vitest';
import { toDisabledMatchers } from './use-availability';

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('toDisabledMatchers', () => {
  /**
   * The API speaks half-open `[start, end)`: `end` is the CHECKOUT day, which
   * the next guest may check in on. react-day-picker's `{from, to}` is
   * inclusive at both ends, so passing `end` through unchanged would grey out
   * one extra day and make every turnover day unbookable — quietly costing a
   * night on every single booking.
   */
  it('excludes the checkout day, which is still bookable', () => {
    const [matcher] = toDisabledMatchers([{ start: '2026-08-11', end: '2026-08-14' }]) as {
      from: Date;
      to: Date;
    }[];

    expect(iso(matcher!.from)).toBe('2026-08-11');
    // Nights 11, 12, 13 are taken. The 14th is checkout — bookable.
    expect(iso(matcher!.to)).toBe('2026-08-13');
  });

  it('handles a single-night range', () => {
    const [matcher] = toDisabledMatchers([{ start: '2026-08-11', end: '2026-08-12' }]) as {
      from: Date;
      to: Date;
    }[];
    expect(iso(matcher!.from)).toBe('2026-08-11');
    expect(iso(matcher!.to)).toBe('2026-08-11');
  });

  it('steps back correctly across a month boundary', () => {
    const [matcher] = toDisabledMatchers([{ start: '2026-08-28', end: '2026-09-01' }]) as {
      from: Date;
      to: Date;
    }[];
    expect(iso(matcher!.to)).toBe('2026-08-31');
  });

  it('maps every range', () => {
    expect(
      toDisabledMatchers([
        { start: '2026-08-11', end: '2026-08-14' },
        { start: '2026-09-01', end: '2026-09-03' },
      ]),
    ).toHaveLength(2);
  });

  it('returns nothing for an empty calendar', () => {
    expect(toDisabledMatchers([])).toEqual([]);
  });
});
