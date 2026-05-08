'use client';

import { ListingForm } from '@/components/admin/listing-form';
import type { ListingImageRef } from '@/lib/api/listings-service';
import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import type { Listing } from '@/types';
import { useRouter } from 'next/navigation';

type EditListingClientProps = {
  listing: Listing;
  images: ListingImageRef[];
};

const toFormValues = (listing: Listing): Partial<CreateListingInput> => ({
  title: listing.title,
  description: listing.description,
  region: listing.region,
  direction: listing.direction,
  placeType: listing.placeType,
  category: listing.category,
  price: listing.price,
  capacity: listing.capacity,
  bedrooms: listing.bedrooms,
  lat: listing.location.lat,
  lng: listing.location.lng,
  address: listing.location.address,
  phone: listing.phone || '+994',
  amenities: listing.amenities,
  meals: listing.meals,
  activities: listing.activities,
});

export function EditListingClient({ listing, images }: EditListingClientProps) {
  const router = useRouter();

  return (
    <ListingForm
      mode="edit"
      listingId={listing.id}
      initialValues={toFormValues(listing)}
      initialImages={images}
      onSubmitted={() => {
        router.push('/admin/listings');
        router.refresh();
      }}
    />
  );
}
