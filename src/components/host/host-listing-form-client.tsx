'use client';

import { ListingForm } from '@/components/listing-form/listing-form';
import { useRouter } from '@/i18n/navigation';
import type { ListingImageRef } from '@/lib/api/listings-service';
import type { Listing } from '@/types';

type Props = {
  action: 'create' | 'edit';
  listing?: Listing;
  images?: ListingImageRef[];
  initialValues?: Parameters<typeof ListingForm>[0]['initialValues'];
};

/**
 * The host cabinet's wrapper around the SHARED listing form.
 *
 * `mode="host"` selects the `/api/host/listings/*` endpoints and nothing else —
 * the fields, validation, and layout are byte-for-byte what the admin sees.
 * What a host may actually change is decided on the server, where it can't be
 * bypassed by editing a prop.
 */
export function HostListingFormClient({ action, listing, images, initialValues }: Props) {
  const router = useRouter();

  return (
    <ListingForm
      mode="host"
      action={action}
      {...(listing ? { listingId: listing.id } : {})}
      {...(initialValues ? { initialValues } : {})}
      {...(images ? { initialImages: images } : {})}
      onSubmitted={() => {
        router.push('/host/listings');
        router.refresh();
      }}
    />
  );
}
