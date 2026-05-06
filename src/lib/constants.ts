import type {
  Activity,
  Amenity,
  Direction,
  GuestRange,
  HomeCategory,
  ListingCategory,
  ListingsFilterState,
  Meal,
  Placement,
  PlaceType,
  Region,
  SortOption,
} from '@/types';

export const SITE = {
  name: 'IRayon',
  description: 'Villa and cottage rentals across Azerbaijan',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;

export const CATEGORIES: readonly ListingCategory[] = [
  'mountain',
  'forest',
  'river',
  'sea',
  'lake',
] as const;

export const REGIONS: readonly Region[] = [
  'gabala',
  'sheki',
  'guba',
  'lankaran',
  'gusar',
  'gakh',
  'ismayilli',
  'goychay',
  'absheron',
  'lerik',
  'zagatala',
] as const;

export const AMENITIES: readonly Amenity[] = [
  'wifi',
  'parking',
  'pool',
  'sauna',
  'jacuzzi',
  'fireplace',
  'kitchen',
  'bbq',
  'pets',
  'heating',
  'ac',
  'tv',
  'washer',
  'iron',
  'hairdryer',
  'crib',
  'kids',
  'ev-charger',
] as const;

export const PRICE_BOUNDS = {
  min: 50,
  max: 1000,
  step: 10,
} as const;

export const DEFAULT_PAGE_SIZE = 12;

export const HOME_CATEGORIES: readonly HomeCategory[] = [
  'all',
  'mountain',
  'forest',
  'river',
  'sea',
  'pool',
  'bbq',
  'winter',
  'cabin',
] as const;

export const HOME_FEATURED_LIMIT = 8;

export const FEATURED_REGIONS: readonly Region[] = [
  'gabala',
  'sheki',
  'guba',
  'gusar',
  'lankaran',
  'absheron',
] as const;

export const DIRECTIONS: readonly Direction[] = [
  'ismayilli',
  'guba',
  'lerik',
  'zagatala',
  'others',
] as const;

export const PLACE_TYPES: readonly PlaceType[] = [
  'a-frame',
  'villa-cottage',
  'hotel',
  'modular',
  'village-room',
] as const;

export const GUEST_RANGES: readonly GuestRange[] = ['lt5', '5to10', 'gt10'] as const;

export const PLACEMENTS: readonly Placement[] = ['forest', 'water'] as const;

export const MEALS: readonly Meal[] = ['breakfast', 'on-request'] as const;

export const EXTRA_AMENITIES: readonly Amenity[] = [
  'pool',
  'sauna',
  'jacuzzi',
  'fireplace',
  'kids',
  'bbq',
  'kitchen',
  'ev-charger',
] as const;

export const BASIC_AMENITIES: readonly Amenity[] = [
  'crib',
  'ac',
  'washer',
  'iron',
  'hairdryer',
] as const;

export const ACTIVITIES: readonly Activity[] = ['quad', 'horse', 'fishing'] as const;

export const SORT_OPTIONS: readonly SortOption[] = [
  'price-asc',
  'price-desc',
  'rating',
  'newest',
] as const;

/**
 * Returns a fresh empty filter state. Always call this — never share a single
 * instance, since callers (e.g. reset flows) spread its arrays into new state
 * via `{...emptyFilterState(), q: prev.q}` and any mutation would corrupt the
 * shared reference.
 */
export const emptyFilterState = (): ListingsFilterState => ({
  q: '',
  direction: [],
  type: [],
  guests: null,
  placement: [],
  food: [],
  extra: [],
  basic: [],
  fun: [],
});
