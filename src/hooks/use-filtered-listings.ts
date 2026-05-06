'use client';

import { useMemo } from 'react';
import { filterByHomeCategory } from '@/lib/listing-filters';
import type { Listing, HomeCategory } from '@/types';

type UseFilteredListingsArgs = {
  listings: Listing[];
  category: HomeCategory;
  limit?: number;
};

export function useFilteredListings({ listings, category, limit }: UseFilteredListingsArgs): {
  listings: Listing[];
  total: number;
} {
  return useMemo(() => {
    const filtered = filterByHomeCategory(listings, category);
    const limited = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
    return { listings: limited, total: filtered.length };
  }, [listings, category, limit]);
}
