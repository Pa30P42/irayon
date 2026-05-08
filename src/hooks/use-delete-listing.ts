'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

type DeleteResult = {
  deleted: boolean;
  storageRemoved: number;
  storageFailed: number;
};

async function deleteListingRequest(id: string): Promise<DeleteResult> {
  const res = await fetch(`/api/admin/listings/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Delete failed (${res.status})`);
  }
  return (await res.json()) as DeleteResult;
}

/**
 * Mutation hook: deletes a listing through the admin API and invalidates
 * the cached listings queries so the table refreshes automatically.
 */
export function useDeleteListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteListingRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}
