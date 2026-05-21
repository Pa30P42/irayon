'use client';

import { ListingForm } from '@/components/admin/listing-form';
import { listingToFormValues } from '@/components/admin/listing-form-labels';
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
      mode="edit"
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
