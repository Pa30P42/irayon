import type { Listing, Locale } from '@/types';
import { ListingCard } from './listing-card';

type ListingGridProps = {
  listings: Listing[];
  locale: Locale;
  emptyMessage?: string;
};

export function ListingGrid({ listings, locale, emptyMessage }: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <p className="text-foreground-muted py-12 text-center">{emptyMessage ?? 'No results.'}</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing, idx) => (
        <ListingCard key={listing.id} listing={listing} locale={locale} priority={idx < 3} />
      ))}
    </div>
  );
}
