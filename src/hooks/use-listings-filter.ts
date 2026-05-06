'use client';

import { applyListingsFilter, sortListings } from '@/lib/listings-filter';
import { listingsFilterParsers } from '@/lib/listings-filter-parsers';
import type { Listing, ListingsFilterState, ListingsView, SortOption } from '@/types';
import { useQueryStates } from 'nuqs';
import { useCallback, useMemo } from 'react';

type UseListingsFilterArgs = {
  listings: Listing[];
};

type UseListingsFilterResult = {
  state: ListingsFilterState;
  sort: SortOption | null;
  view: ListingsView;
  setState: (next: Partial<ListingsFilterState>) => void;
  commit: (next: ListingsFilterState) => void;
  reset: () => void;
  setSort: (sort: SortOption | null) => void;
  setView: (view: ListingsView) => void;
  filtered: Listing[];
};

/**
 * Normalizes a value into a nuqs-friendly null when "empty" so cleared params
 * disappear from the URL instead of lingering as `?direction=` or `?q=`.
 */
const cleanForUrl = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.length ? value : null;
  if (typeof value === 'string') return value || null;
  return value;
};

export function useListingsFilter({ listings }: UseListingsFilterArgs): UseListingsFilterResult {
  const [raw, setRaw] = useQueryStates(listingsFilterParsers, { history: 'push' });

  const state = useMemo<ListingsFilterState>(
    () => ({
      q: raw.q,
      direction: raw.direction,
      type: raw.type,
      guests: raw.guests,
      placement: raw.placement,
      food: raw.food,
      extra: raw.extra,
      basic: raw.basic,
      fun: raw.fun,
    }),
    [raw],
  );

  const filtered = useMemo(() => {
    const base = applyListingsFilter(listings, state);
    return sortListings(base, raw.sort);
  }, [listings, state, raw.sort]);

  const setState = useCallback(
    (next: Partial<ListingsFilterState>) => {
      setRaw(next);
    },
    [setRaw],
  );

  const commit = useCallback(
    (next: ListingsFilterState) => {
      const cleaned = Object.fromEntries(Object.entries(next).map(([k, v]) => [k, cleanForUrl(v)]));
      setRaw(cleaned);
    },
    [setRaw],
  );

  // nuqs accepts `null` to clear every key managed by useQueryStates,
  // including `sort` and `view` — so this also resets sort/view ordering.
  const reset = useCallback(() => {
    setRaw(null);
  }, [setRaw]);

  const setSort = useCallback(
    (sort: SortOption | null) => {
      setRaw({ sort });
    },
    [setRaw],
  );

  const setView = useCallback(
    (view: ListingsView) => {
      setRaw({ view });
    },
    [setRaw],
  );

  return {
    state,
    sort: raw.sort,
    view: raw.view,
    setState,
    commit,
    reset,
    setSort,
    setView,
    filtered,
  };
}
