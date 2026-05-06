import { ListingCard } from './listing-card';
import type { Listing, Locale } from '@/types';

type ListingGridProps = {
  listings: Listing[];
  locale: Locale;
  emptyMessage?: string;
};

export function ListingGrid({ listings, locale, emptyMessage }: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <p className="text-foreground-muted text-center py-12">
        {emptyMessage ?? 'No results.'}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing, idx) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          locale={locale}
          priority={idx < 3}
        />
      ))}
    </div>
  );
}
