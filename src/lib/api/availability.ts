/**
 * Date-range arithmetic for availability.
 *
 * Every range in this module is HALF-OPEN: `[start, end)`. The start day is
 * occupied, the end day is not. That single convention is what makes "one guest
 * checks out on the 5th, another checks in on the 5th" a non-overlap by
 * construction, matching both the Postgres exclusion constraint
 * (`daterange(..., '[)')`) and how check-in/check-out actually work.
 *
 * Values are `@db.Date`-shaped `Date`s (UTC midnight) — see `dates-baku.ts`.
 */

export type DateRange = { start: Date; end: Date };

/**
 * Do two half-open ranges share at least one night?
 *
 * The ONE definition of overlap in the application layer. Both the booking
 * accept path (booking↔booking) and the availability-block path
 * (block↔booking) call it, which closes the gap where the database constraint
 * covers booking↔booking only and the availability endpoint merely *displays*
 * the merged sets.
 */
export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** Does `range` overlap any member of `others`? */
export const overlapsAny = (range: DateRange, others: readonly DateRange[]): boolean =>
  others.some((other) => rangesOverlap(range, other));

/**
 * Collapse overlapping and adjacent ranges into the minimal set.
 *
 * ADJACENT ranges are merged too: `[1,3)` and `[3,5)` become `[1,5)`. They
 * describe a continuous stretch of unavailable nights, and emitting them
 * separately would render as two blocks with a phantom gap between them on the
 * calendar — a gap the guest would try to book.
 */
export function mergeRanges(ranges: readonly DateRange[]): DateRange[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: DateRange[] = [{ ...sorted[0]! }];

  for (const range of sorted.slice(1)) {
    const last = merged[merged.length - 1]!;
    if (range.start.getTime() <= last.end.getTime()) {
      // Overlapping or touching — extend, never shrink.
      if (range.end.getTime() > last.end.getTime()) last.end = range.end;
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
}

/** Clamp to a window, dropping ranges that fall entirely outside it. */
export function clampRanges(ranges: readonly DateRange[], window: DateRange): DateRange[] {
  const out: DateRange[] = [];
  for (const range of ranges) {
    if (!rangesOverlap(range, window)) continue;
    out.push({
      start: range.start.getTime() < window.start.getTime() ? window.start : range.start,
      end: range.end.getTime() > window.end.getTime() ? window.end : range.end,
    });
  }
  return out;
}
