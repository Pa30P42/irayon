'use client';

import { useMutation } from '@tanstack/react-query';

type DeleteImageInput = {
  listingId: string;
  imageId: string;
};

async function deleteImageRequest({ listingId, imageId }: DeleteImageInput): Promise<void> {
  const res = await fetch(
    `/api/admin/listings/${encodeURIComponent(listingId)}/images/${encodeURIComponent(imageId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Delete failed (${res.status})`);
  }
}

export function useDeleteListingImage() {
  return useMutation({ mutationFn: deleteImageRequest });
}
