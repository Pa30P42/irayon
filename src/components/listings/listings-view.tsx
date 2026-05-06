'use client';
// Client component: combines URL-state filters with the listings hook.

import { useFilters } from '@/hooks/use-filters';
import { useListings } from '@/hooks/use-listings';
import type { Listing, Locale } from '@/types';
import { useTranslations } from 'next-intl';
import { ListingFiltersBar } from './listing-filters';
import { ListingGrid } from './listing-grid';

type ListingsViewProps = {
  initialListings: Listing[];
  locale: Locale;
};

export function ListingsView({ initialListings, locale }: ListingsViewProps) {
  const t = useTranslations('listings');
  const { filters } = useFilters();
  const { listings } = useListings({ initial: initialListings, filters });

  return (
    <>
      <ListingFiltersBar />
      <ListingGrid listings={listings} locale={locale} emptyMessage={t('noResults')} />
    </>
  );
}
