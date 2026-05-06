'use client';
// Client component: reads category from URL and renders matching listings.

import { ListingCard } from '@/components/listings/listing-card';
import { useCategoryFilter } from '@/hooks/use-category-filter';
import { useFilteredListings } from '@/hooks/use-filtered-listings';
import { HOME_FEATURED_LIMIT } from '@/lib/constants';
import type { Listing, Locale } from '@/types';
import { useTranslations } from 'next-intl';

type FeaturedListingsProps = {
  initialListings: Listing[];
  locale: Locale;
};

export function FeaturedListings({ initialListings, locale }: FeaturedListingsProps) {
  const t = useTranslations('home.featured');
  const tListings = useTranslations('listings');
  const { category } = useCategoryFilter();
  const { listings } = useFilteredListings({
    listings: initialListings,
    category,
    limit: HOME_FEATURED_LIMIT,
  });

  return (
    <section className="container-wide py-12">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold md:text-3xl">{t('title')}</h2>
        <p className="text-foreground-muted mt-2">{t('subtitle')}</p>
      </header>

      {listings.length === 0 ? (
        <p className="text-foreground-muted py-12 text-center">{tListings('noResults')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {listings.map((listing, idx) => (
            <ListingCard key={listing.id} listing={listing} locale={locale} priority={idx < 4} />
          ))}
        </div>
      )}
    </section>
  );
}
