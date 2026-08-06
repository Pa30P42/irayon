'use client';
// Client component: wires URL filters to a server-fetched infinite listings
// query (TanStack-cached; each filter change refetches page 1, "Load more"
// appends the next page).

import { Button } from '@/components/ui/button';
import { useListingsFilter } from '@/hooks/use-listings-filter';
import { useListingsInfinite } from '@/hooks/use-listings-infinite';
import type { Paginated } from '@/lib/api/api-response';
import type { ListingCardDto, Locale } from '@/types';
import { IconLoader2 } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';
import { ActiveFiltersBar } from './active-filters-bar';
import { ListingGrid } from './listing-grid';
import { ListingsTopBar } from './listings-top-bar';
import { ListingsMapView } from './map/listings-map-view';
import { NoResults } from './no-results';

type ListingsViewProps = {
  initialListings: ListingCardDto[];
  initialMeta: Paginated<ListingCardDto>['meta'];
  /** Server timestamp (ms) of the SSR fetch, so react-query knows the seed's true age. */
  initialFetchedAt?: number;
  locale: Locale;
};

export function ListingsView({
  initialListings,
  initialMeta,
  initialFetchedAt,
  locale,
}: ListingsViewProps) {
  const t = useTranslations('listings');
  const { state, sort, view, setState, commit, reset, setSort, setView } = useListingsFilter();

  const {
    items: listings,
    total,
    isFetching,
    hasMore,
    isFetchingMore,
    loadMore,
  } = useListingsInfinite({
    filters: state,
    sort,
    initialPage: { data: initialListings, meta: initialMeta },
    ...(initialFetchedAt != null ? { initialFetchedAt } : {}),
  });

  const onSearch = useCallback((q: string) => setState({ q: q || '' }), [setState]);

  const resultsRef = useRef<HTMLDivElement>(null);
  // Skip the initial mount; only scroll on discrete filter/sort/view changes.
  // Search updates `state` on every (debounced) keystroke — scrolling on each
  // would be jarring — so we suppress the scroll whenever the only diff is `q`.
  const isFirstRender = useRef(true);
  const prevQRef = useRef(state.q);
  useEffect(() => {
    const qChanged = prevQRef.current !== state.q;
    prevQRef.current = state.q;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (qChanged) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultsRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [state, sort, view]);

  return (
    <>
      <ListingsTopBar
        state={state}
        sort={sort}
        view={view}
        listings={listings}
        onSearch={onSearch}
        onApplyFilters={commit}
        onSortChange={setSort}
        onViewChange={setView}
      />

      <ActiveFiltersBar state={state} onChange={commit} onReset={reset} />

      <div ref={resultsRef} className="scroll-mt-20">
        <p className="text-foreground-muted py-3 text-sm" aria-live="polite">
          {isFetching && listings.length === 0
            ? t('loadingResults')
            : t('foundCount', { count: total })}
        </p>

        {listings.length === 0 ? (
          <NoResults onReset={reset} />
        ) : view === 'map' ? (
          <ListingsMapView listings={listings} locale={locale} />
        ) : (
          <>
            <ListingGrid listings={listings} locale={locale} view={view} />
            {hasMore ? (
              <div className="flex justify-center pt-8">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={loadMore}
                  disabled={isFetchingMore}
                  className="gap-2"
                >
                  {isFetchingMore ? <IconLoader2 size={16} className="animate-spin" /> : null}
                  {t('loadMore', { shown: listings.length, total })}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
