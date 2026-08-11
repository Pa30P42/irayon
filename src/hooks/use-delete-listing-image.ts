'use client';

import type { ListingEndpoints } from '@/components/listing-form/endpoints';
import { useMutation } from '@tanstack/react-query';

type DeleteImageInput = {
  listingId: string;
  imageId: string;
  /** Which cabinet's API to hit — see `components/listing-form/endpoints.ts`. */
  endpoints: ListingEndpoints;
};

async function deleteImageRequest({
  listingId,
  imageId,
  endpoints,
}: DeleteImageInput): Promise<void> {
  const res = await fetch(endpoints.image(listingId, imageId), { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Delete failed (${res.status})`);
  }
}

export function useDeleteListingImage() {
  return useMutation({ mutationFn: deleteImageRequest });
}
