import type { Listing, Locale } from '@/types';
import { BookingCard } from './booking-card';
import { ListingAmenities } from './listing-amenities';
import { ListingDescription } from './listing-description';
import { ListingHeader } from './listing-header';
import { ListingHighlights } from './listing-highlights';
import { ListingHost } from './listing-host';
import { ListingLocation } from './listing-location';
import { PhotoGallery } from './photo-gallery';
import { SimilarListings } from './similar-listings';

type ListingDetailContentProps = {
  listing: Listing;
  similar: Listing[];
  locale: Locale;
};

export function ListingDetailContent({ listing, similar, locale }: ListingDetailContentProps) {
  return (
    <article className="container-wide space-y-10 py-6 md:py-10">
      <PhotoGallery photos={listing.images} alt={listing.title[locale]} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <ListingHeader listing={listing} locale={locale} />
          <ListingHost listing={listing} />
          <ListingHighlights listing={listing} />
          <ListingDescription description={listing.description[locale]} />
          <ListingAmenities listing={listing} />
          <ListingLocation listing={listing} locale={locale} />
        </div>
        <div className="lg:relative">
          <BookingCard listing={listing} locale={locale} />
        </div>
      </div>

      <SimilarListings listings={similar} locale={locale} />
    </article>
  );
}
