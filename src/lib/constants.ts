import type {
  Activity,
  Amenity,
  GuestRange,
  HomeCategory,
  ListingCategory,
  ListingsFilterState,
  Meal,
  Placement,
  PlaceType,
  SortOption,
} from '@/types';

export const SITE = {
  name: 'iRayon',
  description: 'Villa and cottage rentals across Azerbaijan',
  // `NEXT_PUBLIC_SITE_URL` is the canonical name (set per-Vercel-env).
  // `NEXT_PUBLIC_APP_URL` is kept as a fallback for older local .env files.
  url:
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;

/**
 * `true` only on the real production domain (`irayon.az`). Used to gate SEO
 * surfaces (robots.txt, sitemap, page-level robots meta) so the temporary
 * Vercel preview can't be indexed and create duplicate-content issues when
 * the real domain is connected. Flip on by setting NEXT_PUBLIC_SITE_URL on
 * the production env only.
 */
export const IS_PRODUCTION_DOMAIN = SITE.url.includes('irayon.az');

export const CATEGORIES: readonly ListingCategory[] = [
  'mountain',
  'forest',
  'river',
  'sea',
  'lake',
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

/** Fallback count for the homepage Regions grid when no region is featured. */
export const HOME_FEATURED_REGION_LIMIT = 6;

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
  region: [],
  village: [],
  type: [],
  guests: null,
  placement: [],
  food: [],
  extra: [],
  basic: [],
  fun: [],
});
