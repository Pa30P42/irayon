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

const matchesGuests = (listing: Listing, range: GuestRange | null): boolean => {
  if (range === null) return true;
  if (range === 'lt5') return listing.capacity < 5;
  if (range === '5to10') return listing.capacity >= 5 && listing.capacity <= 10;
  return listing.capacity > 10;
};

const matchesPlacement = (listing: Listing, placements: Placement[]): boolean => {
  if (placements.length === 0) return true;
  return placements.some((p) =>
    p === 'forest'
      ? listing.category === 'forest' || listing.category === 'mountain'
      : listing.category === 'river' || listing.category === 'sea' || listing.category === 'lake',
  );
};

const matchesSearch = (listing: Listing, q: string): boolean => {
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

export function applyListingsFilter(listings: Listing[], filters: ListingsFilterState): Listing[] {
  return listings.filter((l) => {
    if (
      filters.village.length > 0 &&
      (l.villageSlug === null || !filters.village.includes(l.villageSlug))
    ) {
      return false;
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
 * TODO(perf): O(groups × options × listings) per modal render. Fine for
 * mock data (~12) but will jank with 1k+. Two faster approaches once we
 * outgrow this:
 *  - Filter once with state minus the current group, then bucket counts.
 *  - Maintain an inverted index Map<group, Map<option, Set<listingId>>>.
 */
export function computeCompatibility(
  listings: Listing[],
  state: ListingsFilterState,
  group: FilterGroupName,
  options: readonly string[],
): FilterCompatibility {
  const result: FilterCompatibility = {};
  for (const opt of options) {
    const trial = withOption(state, group, opt);
    const count = applyListingsFilter(listings, trial).length;
    result[opt] = { count, compatible: count > 0 };
  }
  return result;
}

export function sortListings(listings: Listing[], sort: SortOption | null): Listing[] {
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
