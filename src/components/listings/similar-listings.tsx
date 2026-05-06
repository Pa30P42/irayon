import type { Listing, Locale } from '@/types';
import { useTranslations } from 'next-intl';
import { ListingCard } from './listing-card';

type SimilarListingsProps = {
  listings: Listing[];
  locale: Locale;
};

export function SimilarListings({ listings, locale }: SimilarListingsProps) {
  const t = useTranslations('detail.similar');

  if (listings.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{t('title')}</h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
        {listings.map((listing) => (
          <div key={listing.id} className="w-[80vw] shrink-0 snap-start sm:w-[40vw] lg:w-[24%]">
            <ListingCard listing={listing} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  );
}
