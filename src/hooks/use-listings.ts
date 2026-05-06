'use client';

import type { Listing, ListingFilters } from '@/types';
import { useEffect, useMemo, useState } from 'react';

type UseListingsArgs = {
  initial?: Listing[];
  filters?: ListingFilters;
  fetchOnMount?: boolean;
};

type UseListingsResult = {
  listings: Listing[];
  isLoading: boolean;
  error: Error | null;
};

function buildQuery(filters: ListingFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.region) params.set('region', filters.region);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.capacity !== undefined) params.set('capacity', String(filters.capacity));
  filters.amenities?.forEach((a) => params.append('amenities', a));
  return params.toString();
}

function applyFiltersLocally(listings: Listing[], filters: ListingFilters): Listing[] {
  return listings.filter((l) => {
    if (filters.category && l.category !== filters.category) return false;
    if (filters.region && l.region !== filters.region) return false;
    if (filters.minPrice !== undefined && l.price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && l.price > filters.maxPrice) return false;
    if (filters.capacity !== undefined && l.capacity < filters.capacity) return false;
    if (filters.amenities && filters.amenities.length > 0) {
      if (!filters.amenities.every((a) => l.amenities.includes(a))) return false;
    }
    return true;
  });
}

export function useListings({
  initial = [],
  filters = {},
  fetchOnMount = false,
}: UseListingsArgs = {}): UseListingsResult {
  const [listings, setListings] = useState<Listing[]>(initial);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const query = useMemo(() => buildQuery(filters), [filters]);

  useEffect(() => {
    if (!fetchOnMount) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`/api/listings${query ? `?${query}` : ''}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json() as Promise<{ data: Listing[] }>;
      })
      .then((body) => setListings(body.data))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error('Unknown error'));
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [query, fetchOnMount]);

  const filtered = useMemo(
    () => (fetchOnMount ? listings : applyFiltersLocally(initial, filters)),
    [fetchOnMount, listings, initial, filters],
  );

  return { listings: filtered, isLoading, error };
}
