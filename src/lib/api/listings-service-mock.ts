import { mockListings } from '@/data/mock-listings';
import { applyListingsFilter, sortListings } from '@/lib/listings-filter';
import type {
  Activity,
  Amenity,
  Listing,
  ListingCardDto,
  ListingsFilterState,
  ListingStatus,
  Meal,
  PlaceType,
  RegionSummary,
  RegionWithVillages,
  SortOption,
} from '@/types';
import { listingToCard } from './listing-dto';
import type { ListingsQuery } from './listings-validator';

/**
 * Mock implementations of the listings service. Used when DATABASE_URL is
 * empty so the dev environment runs without a Postgres connection.
 */

export type ListListingsResult = {
  data: ListingCardDto[];
  meta: { total: number; page: number; limit: number; hasMore: boolean };
};

function queryToFilterState(query: ListingsQuery): ListingsFilterState {
  return {
    q: query.q ?? '',
    category: query.category as ListingsFilterState['category'],
    price_min: typeof query.price_min === 'number' ? query.price_min : null,
    price_max: typeof query.price_max === 'number' ? query.price_max : null,
    capacity: typeof query.capacity === 'number' ? query.capacity : null,
    region: query.region,
    village: query.village,
    type: query.type as PlaceType[],
    guests: query.guests ? (query.guests as ListingsFilterState['guests']) : null,
    placement: query.placement as ListingsFilterState['placement'],
    food: query.food as Meal[],
    extra: query.extra as Amenity[],
    basic: query.basic as Amenity[],
    fun: query.fun as Activity[],
  };
}

export function listListingsFromMock(
  query: ListingsQuery,
  status: ListingStatus | 'all' = 'published',
): ListListingsResult {
  const filterState = queryToFilterState(query);
  const visible = status === 'all' ? mockListings : mockListings.filter((l) => l.status === status);
  let results = applyListingsFilter(visible, filterState);

  // category/price/capacity now live in the filter state itself
  // (applyListingsFilter handles them); only the flat amenities list from the
  // API query shape still needs a separate pass.
  if (query.amenities.length > 0) {
    results = results.filter((l) =>
      (query.amenities as Amenity[]).every((a) => l.amenities.includes(a)),
    );
  }

  const total = results.length;
  const sorted = sortListings(results, (query.sort as SortOption | undefined) ?? null);
  const start = (query.page - 1) * query.limit;
  // Mirror the DB path's card projection (no description, cover-only images).
  const data = sorted.slice(start, start + query.limit).map(listingToCard);
  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      hasMore: start + data.length < total,
    },
  };
}

export function getListingFromMock(slug: string): Listing | null {
  // Public read: mirror the DB path's visibility gate.
  return mockListings.find((l) => l.slug === slug && l.status === 'published') ?? null;
}

export function listRegionsFromMock(): RegionSummary[] {
  const counts = new Map<string, number>();
  for (const l of mockListings) counts.set(l.region, (counts.get(l.region) ?? 0) + 1);

  return Array.from(counts.entries()).map(([slug, listingCount], idx) => ({
    id: `mock_${slug}`,
    slug,
    name: { az: slug, ru: slug, en: slug },
    coverImage: null,
    featured: idx < 6,
    sortOrder: (idx + 1) * 10,
    listingCount,
    villageCount: 0,
  }));
}

export function listRegionsWithVillagesFromMock(): RegionWithVillages[] {
  return listRegionsFromMock().map((r) => ({ ...r, villages: [] }));
}
