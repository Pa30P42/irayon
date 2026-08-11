'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type HostBlock = { id: string; start: string; end: string; note: string | null };

const KEY = (listingId: string) => ['host-blocks', listingId] as const;
const enc = encodeURIComponent;

async function fetchBlocks(listingId: string, signal?: AbortSignal): Promise<HostBlock[]> {
  const res = await fetch(`/api/host/listings/${enc(listingId)}/blocks`, {
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`Blocks fetch failed (${res.status})`);
  const json = (await res.json()) as { data: HostBlock[] };
  return json.data;
}

export function useHostBlocks(listingId: string | null) {
  return useQuery({
    queryKey: KEY(listingId ?? ''),
    queryFn: ({ signal }) => fetchBlocks(listingId!, signal),
    enabled: !!listingId,
    staleTime: 30_000,
  });
}

async function mutateJson(path: string, method: string, body?: unknown): Promise<void> {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const parsed = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(parsed?.error?.message ?? `Request failed (${res.status})`);
  }
}

export function useCreateBlock(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { startDate: string; endDate: string; note?: string }) =>
      mutateJson(`/api/host/listings/${enc(listingId)}/blocks`, 'POST', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY(listingId) });
      // Blocking dates changes what the public calendar offers.
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useDeleteBlock(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) =>
      mutateJson(`/api/host/listings/${enc(listingId)}/blocks/${enc(blockId)}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY(listingId) });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
