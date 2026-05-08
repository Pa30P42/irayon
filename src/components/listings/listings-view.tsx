'use client';
// Client component: wires URL filters to listings + grid + top bar.

import { useListingsFilter } from '@/hooks/use-listings-filter';
import type { Listing, Locale } from '@/types';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { ActiveFiltersBar } from './active-filters-bar';
import { ListingGrid } from './listing-grid';
import { ListingsMapView } from './map/listings-map-view';
import { ListingsTopBar } from './listings-top-bar';
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
    </>
  );
}
