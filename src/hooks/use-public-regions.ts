'use client';

import type { RegionSummary, RegionWithVillages, Village } from '@/types';
import { useQuery } from '@tanstack/react-query';

const PUBLIC_REGIONS_KEY = ['regions'] as const;
const PUBLIC_REGIONS_WITH_VILLAGES_KEY = ['regions', 'with-villages'] as const;

const villagesByRegionKey = (regionSlug: string) => ['regions', regionSlug, 'villages'] as const;

const okOrThrow = async <T>(res: Response): Promise<T> => {
  if (res.ok) return res.json() as Promise<T>;
  const text = await res.text().catch(() => '');
  throw new Error(text || `Request failed (${res.status})`);
};

/** Featured + sortable region list, no village payload (small response). */
export function useRegions() {
  return useQuery({
    queryKey: PUBLIC_REGIONS_KEY,
    queryFn: async (): Promise<RegionSummary[]> => {
      const res = await fetch('/api/regions');
      const json = await okOrThrow<{ data: RegionSummary[] }>(res);
      return json.data;
    },
  });
}

/** Region list with villages — used by the cascade in the public filter modal. */
export function useRegionsWithVillages() {
  return useQuery({
    queryKey: PUBLIC_REGIONS_WITH_VILLAGES_KEY,
    queryFn: async (): Promise<RegionWithVillages[]> => {
      const res = await fetch('/api/regions?include=villages');
      const json = await okOrThrow<{ data: RegionWithVillages[] }>(res);
      return json.data;
    },
  });
}

/** Villages of one region — used by the listing form's region→village cascade. */
export function useVillagesByRegionSlug(regionSlug: string | undefined) {
  return useQuery({
    queryKey: regionSlug ? villagesByRegionKey(regionSlug) : ['regions', '__none__', 'villages'],
    queryFn: async (): Promise<Village[]> => {
      const res = await fetch(`/api/regions/${encodeURIComponent(regionSlug!)}/villages`);
      const json = await okOrThrow<{ data: Village[] }>(res);
      return json.data;
    },
    enabled: !!regionSlug,
  });
}
