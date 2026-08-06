'use client';

import { filterByHomeCategory } from '@/lib/listing-filters';
import type { FilterableListing } from '@/lib/listings-filter';
import type { HomeCategory } from '@/types';
import { useMemo } from 'react';

type UseFilteredListingsArgs<T extends FilterableListing> = {
  listings: T[];
  category: HomeCategory;
  limit?: number;
};

export function useFilteredListings<T extends FilterableListing>({
  listings,
  category,
  limit,
}: UseFilteredListingsArgs<T>): {
  listings: T[];
  total: number;
} {
  return useMemo(() => {
    const filtered = filterByHomeCategory(listings, category);
    const limited = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
    return { listings: limited, total: filtered.length };
  }, [listings, category, limit]);
}
