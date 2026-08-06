'use client';

import type { ApiError } from '@/lib/api/api-response';
import type { VillageCreateInput, VillageUpdateInput } from '@/lib/api/villages-validator';
import type { Village } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const adminVillagesByRegionKey = (regionId: string) =>
  ['admin', 'regions', regionId, 'villages'] as const;

const okOrThrow = async (res: Response): Promise<unknown> => {
  if (res.ok) return res.json();
  const body = (await res.json().catch(() => null)) as ApiError | null;
  throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
};

const fetchAdminVillagesByRegion = async (regionId: string): Promise<Village[]> => {
  const res = await fetch(`/api/admin/regions/${regionId}/villages`);
  const json = (await okOrThrow(res)) as { data: Village[] };
  return json.data;
};

export function useAdminVillagesByRegion(regionId: string | undefined) {
  return useQuery({
    queryKey: regionId ? adminVillagesByRegionKey(regionId) : ['admin', 'villages', '__none__'],
    queryFn: ({ queryKey }) => fetchAdminVillagesByRegion(queryKey[2] as string),
    enabled: !!regionId,
  });
}

export function useCreateVillage(regionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: VillageCreateInput,
    ): Promise<{ id: string; slug: string; regionId: string }> => {
      const res = await fetch(`/api/admin/regions/${regionId}/villages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return (await okOrThrow(res)) as { id: string; slug: string; regionId: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminVillagesByRegionKey(regionId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'regions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });
}

export function useUpdateVillage(regionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: VillageUpdateInput;
    }): Promise<Village> => {
      const res = await fetch(`/api/admin/villages/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return (await okOrThrow(res)) as Village;
    },
    onSuccess: (updated) => {
      // The PATCH response IS the fresh row — patch the cached village list
      // in place. If the village moved to ANOTHER region, drop it from this
      // region's list and refetch the target's (we may not have it cached).
      queryClient.setQueryData<Village[]>(adminVillagesByRegionKey(regionId), (prev) => {
        if (!prev) return prev;
        return updated.regionId === regionId
          ? prev.map((v) => (v.id === updated.id ? updated : v))
          : prev.filter((v) => v.id !== updated.id);
      });
      if (updated.regionId !== regionId) {
        queryClient.invalidateQueries({ queryKey: adminVillagesByRegionKey(updated.regionId) });
      }
      // Region list + detail carry village counts/embeds — but NOT the
      // per-region villages keys we just patched (key length 4).
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'admin' && q.queryKey[1] === 'regions' && q.queryKey.length <= 3,
      });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });
}

export function useDeleteVillage(regionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<{ deleted: true }> => {
      const res = await fetch(`/api/admin/villages/${id}`, { method: 'DELETE' });
      return (await okOrThrow(res)) as { deleted: true };
    },
    onSuccess: (_result, id) => {
      // Drop the row from the cached list directly; no refetch needed.
      queryClient.setQueryData<Village[]>(adminVillagesByRegionKey(regionId), (prev) =>
        prev ? prev.filter((v) => v.id !== id) : prev,
      );
      // Region list + detail carry village counts — but NOT the per-region
      // villages keys we just patched (key length 4).
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'admin' && q.queryKey[1] === 'regions' && q.queryKey.length <= 3,
      });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });
}
