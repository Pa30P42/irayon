'use client';

import type { ListingEndpoints } from '@/components/listing-form/endpoints';
import { useMutation } from '@tanstack/react-query';

type ReorderInput = {
  listingId: string;
  /** ALL image ids in the desired display order (index 0 = cover). */
  order: string[];
  /** Which cabinet's API to hit — see `components/listing-form/endpoints.ts`. */
  endpoints: ListingEndpoints;
};

async function reorderRequest({ listingId, order, endpoints }: ReorderInput): Promise<void> {
  const res = await fetch(endpoints.reorder(listingId), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ order }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Reorder failed (${res.status})`);
  }
}

export function useReorderListingImages() {
  return useMutation({ mutationFn: reorderRequest });
}
