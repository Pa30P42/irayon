import type { Paginated } from '@/lib/api/api-response';
import type { ListingsQuery } from '@/lib/api/listings-validator';
import type { Listing } from '@/types';

/**
 * Browser-side fetcher used by TanStack Query hooks. Throws on non-2xx so
 * react-query routes the failure to its `error` channel.
 */

const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

const buildUrl = (path: string, params?: URLSearchParams): string => {
  const base = NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const qs = params && params.toString().length > 0 ? `?${params.toString()}` : '';
  return `${base}${path}${qs}`;
};

const okJson = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as T;
};

export type ListingsQueryInput = Partial<ListingsQuery>;

const isMultivalue = (key: string): boolean =>
  ['region', 'village', 'type', 'placement', 'food', 'extra', 'basic', 'amenities', 'fun'].includes(
    key,
  );

export const buildListingsParams = (input: ListingsQueryInput = {}): URLSearchParams => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      params.set(key, isMultivalue(key) ? value.join(',') : String(value[0]));
    } else if (typeof value === 'string') {
      if (value === '') continue;
      params.set(key, value);
    } else {
      params.set(key, String(value));
    }
  }
  return params;
};

export async function fetchListings(
  input: ListingsQueryInput,
  init?: RequestInit,
): Promise<Paginated<Listing>> {
  const params = buildListingsParams(input);
  const res = await fetch(buildUrl('/api/listings', params), init);
  return okJson<Paginated<Listing>>(res);
}

export async function fetchListingBySlug(
  slug: string,
  init?: RequestInit,
): Promise<Listing | null> {
  const res = await fetch(buildUrl(`/api/listings/${encodeURIComponent(slug)}`), init);
  if (res.status === 404) return null;
  return okJson<Listing>(res);
}

import type { RegionSummary, RegionWithVillages, Village } from '@/types';

export type RegionsResponse = { data: RegionSummary[] };
export type RegionsWithVillagesResponse = { data: RegionWithVillages[] };
export type VillagesResponse = { data: Village[] };

export async function fetchRegions(init?: RequestInit): Promise<RegionsResponse> {
  const res = await fetch(buildUrl('/api/regions'), init);
  return okJson<RegionsResponse>(res);
}

export async function fetchRegionsWithVillages(
  init?: RequestInit,
): Promise<RegionsWithVillagesResponse> {
  const params = new URLSearchParams({ include: 'villages' });
  const res = await fetch(buildUrl('/api/regions', params), init);
  return okJson<RegionsWithVillagesResponse>(res);
}

export async function fetchVillagesByRegion(
  regionSlug: string,
  init?: RequestInit,
): Promise<VillagesResponse> {
  const res = await fetch(
    buildUrl(`/api/regions/${encodeURIComponent(regionSlug)}/villages`),
    init,
  );
  return okJson<VillagesResponse>(res);
}
