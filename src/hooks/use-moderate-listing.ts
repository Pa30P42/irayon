'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

type ApproveInput = { listingId: string };
type RejectInput = { listingId: string; reason: string };

export type ModerationErrorCode = 'approval_would_empty_images';

async function post(url: string, body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.ok) return;

  const parsed = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  const message = parsed?.error?.message ?? `Request failed (${res.status})`;
  throw new Error(message);
}

function invalidateListingCaches(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: ['listings'] });
  queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
}

export function useApproveListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId }: ApproveInput) =>
      post(`/api/admin/moderation/${encodeURIComponent(listingId)}/approve`),
    onSuccess: () => invalidateListingCaches(queryClient),
  });
}

export function useRejectListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, reason }: RejectInput) =>
      post(`/api/admin/moderation/${encodeURIComponent(listingId)}/reject`, { reason }),
    onSuccess: () => invalidateListingCaches(queryClient),
  });
}
