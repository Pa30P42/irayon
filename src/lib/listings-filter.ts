import { GUEST_RANGES } from '@/lib/constants';
import type {
  FilterCompatibility,
  FilterGroupName,
  GuestRange,
  Listing,
  ListingsFilterState,
  Placement,
  SortOption,
} from '@/types';

const isGuestRange = (value: string): value is GuestRange =>
  (GUEST_RANGES as readonly string[]).includes(value);

/**
 * Structural subset the filter/sort helpers actually read. Both the full
 * `Listing` DTO (mock path) and the slim `ListingCardDto` (client) satisfy it.
 */
export type FilterableListing = Omit<Listing, 'description' | 'images'>;

const matchesGuests = (listing: FilterableListing, range: GuestRange | null): boolean => {
  if (range === null) return true;
  if (range === 'lt5') return listing.capacity < 5;
  if (range === '5to10') return listing.capacity >= 5 && listing.capacity <= 10;
  return listing.capacity > 10;
};

const matchesPlacement = (listing: FilterableListing, placements: Placement[]): boolean => {
  if (placements.length === 0) return true;
  const cats = listing.categories;
  return placements.some((p) =>
    p === 'forest'
      ? cats.includes('forest') || cats.includes('mountain')
      : cats.includes('river') || cats.includes('sea') || cats.includes('lake'),
  );
};

const matchesSearch = (listing: FilterableListing, q: string): boolean => {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    listing.title.en,
    listing.title.ru,
    listing.title.az,
    listing.location.address,
    listing.region,
    listing.villageSlug ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
};

export function applyListingsFilter<T extends FilterableListing>(
  listings: T[],
  filters: ListingsFilterState,
): T[] {
  return listings.filter((l) => {
    // Location: OR-combine region and village. A listing matches if its region
    // is in the region filter OR its village is in the village filter. Empty
    // filters are skipped (no constraint).
    const hasRegionFilter = filters.region.length > 0;
    const hasVillageFilter = filters.village.length > 0;
    if (hasRegionFilter || hasVillageFilter) {
      const regionOk = hasRegionFilter && filters.region.includes(l.region);
      const villageOk =
        hasVillageFilter && l.villageSlug !== null && filters.village.includes(l.villageSlug);
      if (!regionOk && !villageOk) return false;
    }
    if (filters.type.length > 0 && !filters.type.includes(l.placeType)) return false;
    if (!matchesGuests(l, filters.guests)) return false;
    if (!matchesPlacement(l, filters.placement)) return false;
    if (filters.food.length > 0 && !filters.food.every((m) => l.meals.includes(m))) return false;
    if (filters.extra.length > 0 && !filters.extra.every((a) => l.amenities.includes(a)))
      return false;
    if (filters.basic.length > 0 && !filters.basic.every((a) => l.amenities.includes(a)))
      return false;
    if (filters.fun.length > 0 && !filters.fun.every((a) => l.activities.includes(a))) return false;
    if (!matchesSearch(l, filters.q)) return false;
    return true;
  });
}

export function withOption(
  state: ListingsFilterState,
  group: FilterGroupName,
  option: string,
): ListingsFilterState {
  if (group === 'guests') {
    if (!isGuestRange(option)) return state;
    return { ...state, guests: option };
  }
  const current = state[group] as readonly string[];
  if (current.includes(option)) return state;
  return { ...state, [group]: [...current, option] } as ListingsFilterState;
}

export function toggleOption(
  state: ListingsFilterState,
  group: FilterGroupName,
  option: string,
): ListingsFilterState {
  if (group === 'guests') {
    if (!isGuestRange(option)) return state;
    return { ...state, guests: state.guests === option ? null : option };
  }
  const current = state[group] as readonly string[];
  const next = current.includes(option)
    ? current.filter((v) => v !== option)
    : [...current, option];
  return { ...state, [group]: next } as ListingsFilterState;
}

export function isOptionSelected(
  state: ListingsFilterState,
  group: FilterGroupName,
  option: string,
): boolean {
  if (group === 'guests') return state.guests === option;
  return (state[group] as readonly string[]).includes(option);
}

/**
 * For each option, returns the count of matching listings if that option were
 * selected, plus a `compatible` flag (count > 0). Used to render the
 * strikethrough state in the filter modal.
 *
 * Single pass: the expensive all-dimensions match is evaluated once per
 * listing; each option then only pays its own cheap predicate. Equivalent to
 * running `applyListingsFilter(withOption(state, group, opt))` per option
 * (the old O(options × listings × groups) version), but ~options× faster.
 */
export function computeCompatibility(
  listings: FilterableListing[],
  state: ListingsFilterState,
  group: FilterGroupName,
  options: readonly string[],
): FilterCompatibility {
  const counts = new Map<string, number>();
  for (const opt of options) counts.set(opt, 0);

  const hasRegionFilter = state.region.length > 0;
  const hasVillageFilter = state.village.length > 0;
  const hasLocationFilter = hasRegionFilter || hasVillageFilter;
  // `withOption` ADDS to a multi-select, so AND-semantics groups keep their
  // current selection in the base match — an added option only narrows.
  const isAndGroup = group === 'food' || group === 'extra' || group === 'basic' || group === 'fun';

  for (const l of listings) {
    if (!matchesSearch(l, state.q)) continue;

    const locationMatch = !hasLocationFilter
      ? true
      : (hasRegionFilter && state.region.includes(l.region)) ||
        (hasVillageFilter && l.villageSlug !== null && state.village.includes(l.villageSlug));

    // Current-selection match per dimension.
    const dims: Record<FilterGroupName, boolean> = {
      region: locationMatch,
      village: locationMatch,
      type: state.type.length === 0 || state.type.includes(l.placeType),
      guests: matchesGuests(l, state.guests),
      placement: matchesPlacement(l, state.placement),
      food: state.food.every((m) => l.meals.includes(m)),
      extra: state.extra.every((a) => l.amenities.includes(a)),
      basic: state.basic.every((a) => l.amenities.includes(a)),
      fun: state.fun.every((a) => l.activities.includes(a)),
    };

    // Base: every dimension except the counted group's own (which the
    // per-option predicate below re-enters). Counting region or village
    // excludes the combined location dimension, since the two OR together.
    let base = true;
    for (const name of Object.keys(dims) as FilterGroupName[]) {
      if (!isAndGroup) {
        if (name === group) continue;
        if (
          (group === 'region' || group === 'village') &&
          (name === 'region' || name === 'village')
        )
          continue;
      }
      if (!dims[name]) {
        base = false;
        break;
      }
    }
    if (!base) continue;

    for (const opt of options) {
      let ok: boolean;
      switch (group) {
        case 'region':
          ok = l.region === opt || (hasLocationFilter && locationMatch);
          break;
        case 'village':
          ok = l.villageSlug === opt || (hasLocationFilter && locationMatch);
          break;
        case 'type':
          ok = l.placeType === opt || (state.type.length > 0 && dims.type);
          break;
        case 'guests':
          ok = isGuestRange(opt) && matchesGuests(l, opt);
          break;
        case 'placement':
          ok =
            matchesPlacement(l, [opt as Placement]) ||
            (state.placement.length > 0 && dims.placement);
          break;
        case 'food':
          ok = l.meals.includes(opt as (typeof l.meals)[number]);
          break;
        case 'fun':
          ok = l.activities.includes(opt as (typeof l.activities)[number]);
          break;
        case 'extra':
        case 'basic':
          ok = l.amenities.includes(opt as (typeof l.amenities)[number]);
          break;
      }
      if (ok) counts.set(opt, (counts.get(opt) ?? 0) + 1);
    }
  }

  const result: FilterCompatibility = {};
  for (const opt of options) {
    const count = counts.get(opt) ?? 0;
    result[opt] = { count, compatible: count > 0 };
  }
  return result;
}

export function sortListings<T extends FilterableListing>(
  listings: T[],
  sort: SortOption | null,
): T[] {
  if (!sort) return listings;
  const copy = [...listings];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price);
    case 'rating':
      return copy.sort((a, b) => b.rating - a.rating);
    case 'newest':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function countActiveFilters(state: ListingsFilterState): number {
  let n = 0;
  n += state.region.length;
  n += state.village.length;
  n += state.type.length;
  n += state.guests ? 1 : 0;
  n += state.placement.length;
  n += state.food.length;
  n += state.extra.length;
  n += state.basic.length;
  n += state.fun.length;
  return n;
}
