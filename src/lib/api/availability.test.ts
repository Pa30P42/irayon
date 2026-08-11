import { toDateOnly } from '@/lib/dates-baku';
import { describe, expect, it } from 'vitest';
import {
  clampRanges,
  mergeRanges,
  overlapsAny,
  rangesOverlap,
  type DateRange,
} from './availability';

/** `d(11, 14)` → the half-open range 2026-08-11 … 2026-08-14. */
const day = (n: number) => toDateOnly({ year: 2026, month: 8, day: n });
const r = (start: number, end: number): DateRange => ({ start: day(start), end: day(end) });
const iso = (range: DateRange) =>
  `${range.start.toISOString().slice(0, 10)}..${range.end.toISOString().slice(0, 10)}`;

describe('rangesOverlap', () => {
  it('detects a partial overlap in both directions', () => {
    expect(rangesOverlap(r(11, 15), r(13, 18))).toBe(true);
    expect(rangesOverlap(r(13, 18), r(11, 15))).toBe(true);
  });

  it('detects containment in both directions', () => {
    expect(rangesOverlap(r(11, 20), r(13, 15))).toBe(true);
    expect(rangesOverlap(r(13, 15), r(11, 20))).toBe(true);
  });

  /**
   * The case the whole half-open convention exists for: one guest checks out on
   * the 15th, another checks in on the 15th. That is a normal turnover day, not
   * a double booking — and it matches `daterange(..., '[)')` in the exclusion
   * constraint exactly.
   */
  it('does NOT treat back-to-back stays as an overlap', () => {
    expect(rangesOverlap(r(11, 15), r(15, 18))).toBe(false);
    expect(rangesOverlap(r(15, 18), r(11, 15))).toBe(false);
  });

  it('does not overlap ranges separated by a gap', () => {
    expect(rangesOverlap(r(11, 13), r(16, 18))).toBe(false);
  });

  it('detects a single shared night', () => {
    expect(rangesOverlap(r(11, 15), r(14, 20))).toBe(true);
  });

  it('is true for identical ranges', () => {
    expect(rangesOverlap(r(11, 15), r(11, 15))).toBe(true);
  });
});

describe('overlapsAny', () => {
  it('is false against an empty set', () => {
    expect(overlapsAny(r(11, 15), [])).toBe(false);
  });

  it('finds a conflict anywhere in the set', () => {
    expect(overlapsAny(r(11, 15), [r(1, 5), r(20, 25), r(14, 16)])).toBe(true);
    expect(overlapsAny(r(11, 15), [r(1, 5), r(20, 25), r(15, 16)])).toBe(false);
  });
});

describe('mergeRanges', () => {
  it('returns an empty set unchanged', () => {
    expect(mergeRanges([])).toEqual([]);
  });

  it('merges overlapping ranges', () => {
    expect(mergeRanges([r(11, 15), r(13, 18)]).map(iso)).toEqual(['2026-08-11..2026-08-18']);
  });

  /**
   * Adjacent ranges merge too. `[11,15)` and `[15,18)` are a continuous stretch
   * of unavailable nights; emitting them separately renders as two blocks with
   * a phantom gap on the 15th, which is a night the guest would then try to
   * book.
   */
  it('merges adjacent ranges into one continuous stretch', () => {
    expect(mergeRanges([r(11, 15), r(15, 18)]).map(iso)).toEqual(['2026-08-11..2026-08-18']);
  });

  it('keeps genuinely separate ranges apart', () => {
    expect(mergeRanges([r(11, 13), r(16, 18)]).map(iso)).toEqual([
      '2026-08-11..2026-08-13',
      '2026-08-16..2026-08-18',
    ]);
  });

  it('sorts before merging, so input order does not matter', () => {
    expect(mergeRanges([r(16, 18), r(11, 13), r(12, 17)]).map(iso)).toEqual([
      '2026-08-11..2026-08-18',
    ]);
  });

  it('never shrinks a range when a shorter one is contained in it', () => {
    expect(mergeRanges([r(11, 25), r(13, 15)]).map(iso)).toEqual(['2026-08-11..2026-08-25']);
  });

  it('does not mutate its input', () => {
    const input = [r(11, 15), r(13, 18)];
    const before = input.map(iso);
    mergeRanges(input);
    expect(input.map(iso)).toEqual(before);
  });
});

describe('clampRanges', () => {
  const window = r(10, 20);

  it('drops ranges entirely outside the window', () => {
    expect(clampRanges([r(1, 5), r(25, 30)], window)).toEqual([]);
  });

  it('trims ranges that straddle either edge', () => {
    expect(clampRanges([r(1, 12), r(18, 30)], window).map(iso)).toEqual([
      '2026-08-10..2026-08-12',
      '2026-08-18..2026-08-20',
    ]);
  });

  it('leaves fully contained ranges alone', () => {
    expect(clampRanges([r(12, 15)], window).map(iso)).toEqual(['2026-08-12..2026-08-15']);
  });

  it('drops a range that merely touches the window edge', () => {
    // `[5,10)` ends exactly where the window starts — no shared night.
    expect(clampRanges([r(5, 10)], window)).toEqual([]);
  });
});
