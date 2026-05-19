'use client';
// Client component: wires URL filters to listings + grid + top bar.

import { useListingsFilter } from '@/hooks/use-listings-filter';
import type { Listing, Locale } from '@/types';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';
import { ActiveFiltersBar } from './active-filters-bar';
import { ListingGrid } from './listing-grid';
import { ListingsTopBar } from './listings-top-bar';
import { ListingsMapView } from './map/listings-map-view';
import { NoResults } from './no-results';

type ListingsViewProps = {
  initialListings: Listing[];
  locale: Locale;
};

export function ListingsView({ initialListings, locale }: ListingsViewProps) {
  const t = useTranslations('listings');
  const { state, sort, view, setState, commit, reset, setSort, setView, filtered } =
    useListingsFilter({ listings: initialListings });

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
        listings={initialListings}
        sort={sort}
        view={view}
        onSearch={onSearch}
        onApplyFilters={commit}
        onSortChange={setSort}
        onViewChange={setView}
      />

      <ActiveFiltersBar state={state} onChange={commit} onReset={reset} />

      <div ref={resultsRef} className="scroll-mt-20">
        <p className="text-foreground-muted py-3 text-sm">
          {t('foundCount', { count: filtered.length })}
        </p>

        {filtered.length === 0 ? (
          <NoResults onReset={reset} />
        ) : view === 'map' ? (
          <ListingsMapView listings={filtered} locale={locale} />
        ) : (
          <ListingGrid listings={filtered} locale={locale} view={view} />
        )}
      </div>
    </>
  );
}
