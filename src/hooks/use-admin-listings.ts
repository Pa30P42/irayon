'use client';

import {
  fetchAdminListings,
  patchListingStatus,
  type AdminListingsQueryInput,
} from '@/lib/api/api-client';
import type { ListingStatus } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const adminListingsQueryKey = (input: AdminListingsQueryInput = {}) =>
  ['admin-listings', input] as const;

/**
 * Admin catalogue query — unlike the public `useListings`, this includes
 * drafts and archived rows (scoped by `input.status`, default `all`).
 */
export function useAdminListings(input: AdminListingsQueryInput = {}) {
  return useQuery({
    queryKey: adminListingsQueryKey(input),
    queryFn: ({ signal }) => fetchAdminListings(input, { signal }),
  });
}

export type AdminCallStats = {
  total30d: number;
  byListing: Record<string, number>;
};

/** 30-day call-tap summary shown in the admin list header + per row. */
export function useAdminCallStats() {
  return useQuery({
    queryKey: ['admin-call-stats'],
    queryFn: async ({ signal }): Promise<AdminCallStats> => {
      const res = await fetch('/api/admin/calls', { signal });
      if (!res.ok) throw new Error(`Call stats failed (${res.status})`);
      return (await res.json()) as AdminCallStats;
    },
    staleTime: 60_000,
  });
}

/** Status flip for the admin list's publish/unpublish/archive quick actions. */
export function useListingStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ListingStatus }) =>
      patchListingStatus(id, status),
    onSuccess: () => {
      // Status changes what both the admin and public lists should show.
      void queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
      void queryClient.invalidateQueries({ queryKey: ['listings-grid'] });
    },
  });
}
