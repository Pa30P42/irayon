'use client';

import { fetchListings } from '@/lib/api/api-client';
import type { Paginated } from '@/lib/api/api-response';
import { queryFromFilterState } from '@/lib/api/listings-query-from-state';
import { GRID_PAGE_SIZE } from '@/lib/listings-pagination';
import type { ListingCardDto, ListingsFilterState, SortOption } from '@/types';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';

type UseListingsInfiniteArgs = {
  filters: ListingsFilterState;
  sort: SortOption | null;
  /** SSR-rendered first page for the initial filters — seeds React Query so
   *  first paint is instant and SEO-complete (no client round-trip on load). */
  initialPage?: Paginated<ListingCardDto>;
  /** Server timestamp (ms) of when `initialPage` was fetched, so React Query
   *  knows the seed's true age instead of assuming it's fresh at mount. */
  initialFetchedAt?: number;
};

/** How long grid data is served from cache without a background refetch. */
const GRID_STALE_TIME_MS = 60_000;

/**
 * Query-driven grid data: each filter/sort change refetches page 1 from the
 * server (DB-level WHERE + pagination), and "Load more" appends the next
 * page. `keepPreviousData` keeps the old grid on screen while the new key
 * loads, so filter flips don't blank the page.
 */
export function useListingsInfinite({
  filters,
  sort,
  initialPage,
  initialFetchedAt,
}: UseListingsInfiniteArgs) {
  const filterInput = useMemo(() => queryFromFilterState(filters, sort), [filters, sort]);

  // The SSR page corresponds only to the initial filter key — seed that key
  // alone, or changing filters would briefly show the seed under a new key.
  const initialKey = useRef(JSON.stringify(filterInput));
  const isInitialKey = JSON.stringify(filterInput) === initialKey.current;

  const query = useInfiniteQuery({
    queryKey: ['listings-grid', filterInput],
    queryFn: ({ pageParam, signal }) =>
      fetchListings({ ...filterInput, page: pageParam, limit: GRID_PAGE_SIZE }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
    ...(initialPage && isInitialKey
      ? {
          initialData: { pages: [initialPage], pageParams: [1] },
          // Date the seed by its actual server fetch time so a just-rendered
          // SSR page is NOT immediately refetched, while a genuinely stale
          // seed still revalidates on mount. Clamped to the client clock: a
          // client running behind would otherwise see a future date and treat
          // the seed as fresh forever.
          ...(initialFetchedAt != null
            ? { initialDataUpdatedAt: Math.min(initialFetchedAt, Date.now()) }
            : {}),
        }
      : {}),
    staleTime: GRID_STALE_TIME_MS,
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.data) ?? [], [query.data]);
  const total = query.data?.pages[0]?.meta.total ?? 0;

  return {
    items,
    total,
    isPending: query.isPending,
    isFetching: query.isFetching,
    hasMore: Boolean(query.hasNextPage),
    isFetchingMore: query.isFetchingNextPage,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
  };
}
