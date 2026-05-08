'use client';

import { computeCompatibility } from '@/lib/listings-filter';
import type { FilterCompatibility, FilterGroupName, Listing, ListingsFilterState } from '@/types';
import { useMemo } from 'react';

type UseFilterCompatibilityArgs = {
  listings: Listing[];
  state: ListingsFilterState;
  group: FilterGroupName;
  options: readonly string[];
};

export function useFilterCompatibility({
  listings,
  state,
  group,
  options,
}: UseFilterCompatibilityArgs): FilterCompatibility {
  return useMemo(() => {
    // No listings loaded yet (e.g. data still fetching): treat every option as
    // compatible with no count — better UX than greying everything out.
    if (listings.length === 0) {
      return Object.fromEntries(
        options.map((opt) => [opt, { count: 0, compatible: true }]),
      ) as FilterCompatibility;
    }
    return computeCompatibility(listings, state, group, options);
  }, [listings, state, group, options]);
}
