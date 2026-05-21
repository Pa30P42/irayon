import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/typography';
import { pickLocalized } from '@/lib/utils';
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
  const tCategories = useTranslations('categories');

  const title = listing.title[locale];
  const regionName = pickLocalized(listing.regionName, locale);

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {listing.categories.map((c) => (
          <Badge key={c} variant="solid">
            {tCategories(c)}
          </Badge>
        ))}
        <Badge variant="outline">{regionName}</Badge>
      </div>

      <Heading as="h1" level="detail">
        {title}
      </Heading>

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
