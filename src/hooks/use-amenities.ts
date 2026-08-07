'use client';

import type { AmenityOption } from '@/types';
import { useQuery } from '@tanstack/react-query';

export const AMENITIES_QUERY_KEY = ['amenities'] as const;

async function fetchAmenities(signal?: AbortSignal): Promise<AmenityOption[]> {
  const res = await fetch('/api/amenities', { ...(signal ? { signal } : {}) });
  if (!res.ok) throw new Error(`Amenities fetch failed (${res.status})`);
  const json = (await res.json()) as { data: AmenityOption[] };
  return json.data;
}

/**
 * DB-driven amenity catalogue. Long staleTime — the catalogue changes only
 * when the admin edits it, and mutations invalidate this key.
 */
export function useAmenities(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: AMENITIES_QUERY_KEY,
    queryFn: ({ signal }) => fetchAmenities(signal),
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
  });
}
