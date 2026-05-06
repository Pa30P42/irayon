'use client';

import { fetchListingBySlug } from '@/lib/api/api-client';
import type { Listing } from '@/types';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export const listingQueryKey = (slug: string) => ['listing', slug] as const;

type Options = Omit<
  UseQueryOptions<Listing | null, Error, Listing | null, ReturnType<typeof listingQueryKey>>,
  'queryKey' | 'queryFn'
>;

/**
 * Fetches a single listing from `/api/listings/[slug]`. Returns `null` for 404,
 * which lets callers distinguish a missing listing from a network failure.
 */
export function useListing(slug: string, options?: Options) {
  return useQuery({
    queryKey: listingQueryKey(slug),
    queryFn: ({ signal }) => fetchListingBySlug(slug, { signal }),
    enabled: Boolean(slug),
    ...options,
  });
}
