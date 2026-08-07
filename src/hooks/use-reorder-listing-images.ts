'use client';

import { useMutation } from '@tanstack/react-query';

type ReorderInput = {
  listingId: string;
  /** ALL image ids in the desired display order (index 0 = cover). */
  order: string[];
};

async function reorderRequest({ listingId, order }: ReorderInput): Promise<void> {
  const res = await fetch(`/api/admin/listings/${encodeURIComponent(listingId)}/images/reorder`, {
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
