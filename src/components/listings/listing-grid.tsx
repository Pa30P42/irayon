import { cn } from '@/lib/utils';
import type { Listing, ListingsView, Locale } from '@/types';
import { ListingCard } from './listing-card';
import { ListingRow } from './listing-row';

type ListingGridProps = {
  listings: Listing[];
  locale: Locale;
  view?: ListingsView;
};

/**
 * Renders a non-empty list of listings. Empty-state is the caller's
 * responsibility (see `<NoResults>` in [listings-view.tsx]).
 */
export function ListingGrid({ listings, locale, view = 'grid' }: ListingGridProps) {
  if (view === 'list') {
    return (
      <div className="flex flex-col gap-4">
        {listings.map((listing, idx) => (
          <ListingRow key={listing.id} listing={listing} locale={locale} priority={idx < 3} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3')}>
      {listings.map((listing, idx) => (
        <ListingCard key={listing.id} listing={listing} locale={locale} priority={idx < 3} />
      ))}
    </div>
  );
}
