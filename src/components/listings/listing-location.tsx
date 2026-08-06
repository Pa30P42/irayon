import { ListingsMapLoader } from '@/components/listings/map/listings-map-loader';
import { Heading } from '@/components/ui/typography';
import { listingToCard } from '@/lib/api/listing-dto';
import type { Listing, Locale } from '@/types';
import { IconMapPin } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type ListingLocationProps = {
  listing: Listing;
  locale: Locale;
};

export function ListingLocation({ listing, locale }: ListingLocationProps) {
  const t = useTranslations('detail.location');
  const { address } = listing.location;

  return (
    <section className="space-y-4">
      <Heading level="subsection">{t('title')}</Heading>

      <div className="border-border relative aspect-16/9 w-full overflow-hidden rounded-2xl border">
        <ListingsMapLoader
          listings={[listingToCard(listing)]}
          locale={locale}
          scrollWheelZoom={false}
          cluster={false}
          showPopups={false}
        />
      </div>

      <p className="text-foreground-muted inline-flex items-center gap-2 text-sm">
        <IconMapPin size={16} className="text-primary" aria-hidden />
        <span>{address}</span>
      </p>
    </section>
  );
}
