'use client';

import { fetchListings, type ListingsQueryInput } from '@/lib/api/api-client';
import type { Paginated } from '@/lib/api/api-response';
import type { Listing } from '@/types';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export const listingsQueryKey = (input: ListingsQueryInput = {}) => ['listings', input] as const;

type Options = Omit<
  UseQueryOptions<
    Paginated<Listing>,
    Error,
    Paginated<Listing>,
    ReturnType<typeof listingsQueryKey>
  >,
  'queryKey' | 'queryFn'
>;

/**
 * Fetches listings from `/api/listings` with TanStack Query caching. The hook
 * passes filter state through to the API; the server applies filtering and
 * pagination, and the response includes `meta` for pagination wiring.
 */
export function useListings(input: ListingsQueryInput = {}, options?: Options) {
  return useQuery({
    queryKey: listingsQueryKey(input),
    queryFn: ({ signal }) => fetchListings(input, { signal }),
    ...options,
  });
}
