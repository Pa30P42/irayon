'use client';
// Client component: wires URL filters to a server-fetched listings query
// (TanStack-cached, refetches when the URL filter slice changes).

import { useListingsFilter } from '@/hooks/use-listings-filter';
import { useListings } from '@/hooks/use-listings';
import type { Paginated } from '@/lib/api/api-response';
import { queryFromFilterState } from '@/lib/api/listings-query-from-state';
import type { Listing, Locale } from '@/types';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActiveFiltersBar } from './active-filters-bar';
import { ListingGrid } from './listing-grid';
import { ListingsTopBar } from './listings-top-bar';
import { ListingsMapView } from './map/listings-map-view';
import { NoResults } from './no-results';

type ListingsViewProps = {
  initialListings: Listing[];
  initialMeta: Paginated<Listing>['meta'];
  locale: Locale;
};

export function ListingsView({ initialListings, initialMeta, locale }: ListingsViewProps) {
  const t = useTranslations('listings');
  const { state, sort, view, setState, commit, reset, setSort, setView } = useListingsFilter();

  // Server already filtered/sorted by the URL on first render. The same query
  // input gets rebuilt here so the SSR payload populates the TanStack cache
  // for that key; any subsequent URL change (filter toggle, sort flip) re-derives
  // the query, swaps the cache key, and TanStack fetches the new page.
  const query = useMemo(() => queryFromFilterState(state, sort, { limit: 100 }), [state, sort]);

  const { data, isFetching } = useListings(query, {
    initialData: { data: initialListings, meta: initialMeta },
  });
  const listings = data?.data ?? initialListings;

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
            : t('foundCount', { count: listings.length })}
        </p>

        {listings.length === 0 ? (
          <NoResults onReset={reset} />
        ) : view === 'map' ? (
          <ListingsMapView listings={listings} locale={locale} />
        ) : (
          <ListingGrid listings={listings} locale={locale} view={view} />
        )}
      </div>
    </>
  );
}
