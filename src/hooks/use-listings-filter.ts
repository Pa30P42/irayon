'use client';

import { listingsFilterParsers } from '@/lib/listings-filter-parsers';
import type { ListingsFilterState, ListingsView, SortOption } from '@/types';
import { useQueryStates } from 'nuqs';
import { useCallback, useMemo } from 'react';

type UseListingsFilterResult = {
  state: ListingsFilterState;
  sort: SortOption | null;
  view: ListingsView;
  setState: (next: Partial<ListingsFilterState>) => void;
  commit: (next: ListingsFilterState) => void;
  reset: () => void;
  setSort: (sort: SortOption | null) => void;
  setView: (view: ListingsView) => void;
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

/**
 * Owns the URL slice that describes the current listings query — region,
 * village, type, guests, placement, food, extra, basic, fun, q, sort, view.
 *
 * Used to be the place where in-memory filtering happened too; that moved to
 * the server (the `/listings` page parses the URL and Prisma-filters before
 * SSR; the client refetches the matching page on URL change via TanStack).
 * This hook is now strictly the URL-state owner.
 */
export function useListingsFilter(): UseListingsFilterResult {
  // Filter changes use `replace` so typing in search or toggling chips doesn't
  // pile up history entries — back should return to where the user came from,
  // not undo individual toggles. The filter-modal open flag is what owns the
  // single "back closes me" history entry (see [[use-filter-modal]]).
  const [raw, setRaw] = useQueryStates(listingsFilterParsers, { history: 'replace' });

  const state = useMemo<ListingsFilterState>(
    () => ({
      q: raw.q,
      category: raw.category,
      price_min: raw.price_min,
      price_max: raw.price_max,
      capacity: raw.capacity,
      region: raw.region,
      village: raw.village,
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
  };
}
