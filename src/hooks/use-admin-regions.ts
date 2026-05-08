'use client';

import type { ApiError } from '@/lib/api/api-response';
import type {
  RegionCreateInput,
  RegionUpdateInput,
} from '@/lib/api/regions-validator';
import type { RegionWithVillages } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const ADMIN_REGIONS_KEY = ['admin', 'regions'] as const;

const adminRegionKey = (id: string) => ['admin', 'regions', id] as const;

const okOrThrow = async (res: Response): Promise<unknown> => {
  if (res.ok) return res.json();
  const body = (await res.json().catch(() => null)) as ApiError | null;
  throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
};

const fetchAdminRegions = async (): Promise<RegionWithVillages[]> => {
  const res = await fetch('/api/admin/regions');
  const json = (await okOrThrow(res)) as { data: RegionWithVillages[] };
  return json.data;
};

const fetchAdminRegion = async (id: string): Promise<RegionWithVillages> => {
  const res = await fetch(`/api/admin/regions/${id}`);
  return (await okOrThrow(res)) as RegionWithVillages;
};

export function useAdminRegions() {
  return useQuery({ queryKey: ADMIN_REGIONS_KEY, queryFn: fetchAdminRegions });
}

export function useAdminRegion(id: string | undefined) {
  return useQuery({
    queryKey: id ? adminRegionKey(id) : ['admin', 'regions', '__none__'],
    queryFn: () => fetchAdminRegion(id!),
    enabled: !!id,
  });
}

export function useCreateRegion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegionCreateInput): Promise<{ id: string; slug: string }> => {
      const res = await fetch('/api/admin/regions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return (await okOrThrow(res)) as { id: string; slug: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REGIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });
}

export function useUpdateRegion(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegionUpdateInput): Promise<RegionWithVillages> => {
      const res = await fetch(`/api/admin/regions/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return (await okOrThrow(res)) as RegionWithVillages;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REGIONS_KEY });
      queryClient.invalidateQueries({ queryKey: adminRegionKey(id) });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });
}

export function useDeleteRegion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<{ deleted: true }> => {
      const res = await fetch(`/api/admin/regions/${id}`, { method: 'DELETE' });
      return (await okOrThrow(res)) as { deleted: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REGIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });
}
