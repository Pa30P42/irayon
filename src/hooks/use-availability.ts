'use client';

import { useQuery } from '@tanstack/react-query';
import type { Matcher } from 'react-day-picker';

export type UnavailableRange = { start: string; end: string };

const AVAILABILITY_QUERY_KEY = (slug: string) => ['availability', slug] as const;

async function fetchAvailability(slug: string, signal?: AbortSignal): Promise<UnavailableRange[]> {
  const res = await fetch(`/api/listings/${encodeURIComponent(slug)}/availability`, {
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`Availability fetch failed (${res.status})`);
  const json = (await res.json()) as { data: UnavailableRange[] };
  return json.data;
}

/**
 * Unavailable date ranges for a listing.
 *
 * Fetched lazily — `enabled` is driven by the calendar popover being open — so
 * the listing detail page stays on ISR and pays nothing for visitors who never
 * open the date picker.
 */
export function useAvailability(slug: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: AVAILABILITY_QUERY_KEY(slug),
    queryFn: ({ signal }) => fetchAvailability(slug, signal),
    enabled: options.enabled ?? true,
    // Matches the endpoint's own CDN window; refetching sooner just re-reads
    // the same cached response.
    staleTime: 60_000,
  });
}

/**
 * Convert the API's half-open ranges into react-day-picker matchers.
 *
 * The API speaks `[start, end)` — `end` is the checkout day, which is still
 * bookable by the next guest. react-day-picker's `{from, to}` is INCLUSIVE at
 * both ends, so passing `end` straight through would grey out one extra day
 * and quietly make every turnover day unbookable.
 */
export function toDisabledMatchers(ranges: readonly UnavailableRange[]): Matcher[] {
  return ranges.map((range) => {
    const from = new Date(`${range.start}T00:00:00.000Z`);
    const lastNight = new Date(`${range.end}T00:00:00.000Z`);
    // Step back one day: the last UNAVAILABLE night is the day before checkout.
    lastNight.setUTCDate(lastNight.getUTCDate() - 1);
    return { from, to: lastNight };
  });
}
