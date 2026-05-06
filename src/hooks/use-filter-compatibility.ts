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
  return useMemo(
    () => computeCompatibility(listings, state, group, options),
    [listings, state, group, options],
  );
}
