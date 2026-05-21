import type { ListingsFilterState, SortOption } from '@/types';
import type { ListingsQueryInput } from './api-client';

/**
 * Project the client-owned filter state (the nuqs-backed URL slice in
 * `useListingsFilter`) into the `ListingsQueryInput` shape expected by the
 * `/api/listings` endpoint.
 *
 * Empty fields are omitted on purpose so the TanStack Query key stays small
 * and stable — `{}` for the default catalog view, never a noisy
 * `{ region: [], village: [], … }`.
 */
export function queryFromFilterState(
  state: ListingsFilterState,
  sort: SortOption | null,
  overrides?: ListingsQueryInput,
): ListingsQueryInput {
  const out: ListingsQueryInput = {};
  if (state.q) out.q = state.q;
  if (state.region.length) out.region = state.region;
  if (state.village.length) out.village = state.village;
  if (state.type.length) out.type = state.type;
  if (state.guests) out.guests = state.guests;
  if (state.placement.length) out.placement = state.placement;
  if (state.food.length) out.food = state.food;
  if (state.extra.length) out.extra = state.extra;
  if (state.basic.length) out.basic = state.basic;
  if (state.fun.length) out.fun = state.fun;
  if (sort) out.sort = sort;
  return { ...out, ...overrides };
}
