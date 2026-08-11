'use client';

import { listingToFormValues } from '@/components/listing-form/labels';
import { ListingForm } from '@/components/listing-form/listing-form';
import type { ListingImageRef } from '@/lib/api/listings-service';
import type { Listing } from '@/types';
import { useRouter } from 'next/navigation';

type EditListingClientProps = {
  listing: Listing;
  images: ListingImageRef[];
};

export function EditListingClient({ listing, images }: EditListingClientProps) {
  const router = useRouter();

  return (
    <ListingForm
      mode="admin"
      action="edit"
      listingId={listing.id}
      initialValues={listingToFormValues(listing)}
      initialImages={images}
      onSubmitted={() => {
        router.push('/admin/listings');
        router.refresh();
      }}
    />
  );
}
