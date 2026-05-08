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
    queryFn: () => fetchAdminVillagesByRegion(regionId!),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminVillagesByRegionKey(regionId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'regions'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminVillagesByRegionKey(regionId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'regions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });
}
