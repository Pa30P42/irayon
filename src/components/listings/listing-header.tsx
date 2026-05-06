import { Badge } from '@/components/ui/badge';
import type { Listing, Locale } from '@/types';
import { IconStarFilled } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { ShareSaveButtons } from './share-save-buttons';

type ListingHeaderProps = {
  listing: Listing;
  locale: Locale;
};

export function ListingHeader({ listing, locale }: ListingHeaderProps) {
  const tListings = useTranslations('listings');
  const tRegions = useTranslations('regions');
  const tCategories = useTranslations('categories');

  const title = listing.title[locale];
  const regionName = tRegions(listing.region);

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="solid">{tCategories(listing.category)}</Badge>
        <Badge variant="outline">{regionName}</Badge>
      </div>

      <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm" aria-label={tListings('rating')}>
          <IconStarFilled size={16} aria-hidden />
          <span className="font-medium">{listing.rating.toFixed(1)}</span>
          <span className="text-foreground-muted">
            · {listing.reviewCount} {tListings('reviews')}
          </span>
          <span className="text-foreground-muted">·</span>
          <span className="text-foreground-muted">{listing.location.address}</span>
        </div>
        <ShareSaveButtons shareTitle={title} shareText={listing.description[locale]} />
      </div>
    </header>
  );
}
