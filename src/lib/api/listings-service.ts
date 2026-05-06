import { mockListings } from '@/data/mock-listings';
import { applyListingsFilter, countActiveFilters, sortListings } from '@/lib/listings-filter';
import { prisma as defaultPrisma } from '@/lib/prisma';
import type {
  Activity,
  Amenity,
  Direction,
  Listing,
  ListingCategory,
  ListingsFilterState,
  LocalizedText,
  Meal,
  PlaceType,
  Region,
  SortOption,
} from '@/types';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { ListingsQuery } from './listings-validator';

export type ListListingsResult = {
  data: Listing[];
  meta: { total: number; page: number; limit: number; hasMore: boolean };
};

/** Service runs against mock data when no DB is configured. */
export const isUsingMockData = (): boolean =>
  !process.env.DATABASE_URL || process.env.DATABASE_URL === '';

// ---------------------------------------------------------------------------
// Public API — picks the DB or mock path based on env.
// ---------------------------------------------------------------------------

export async function listListings(query: ListingsQuery): Promise<ListListingsResult> {
  return isUsingMockData() ? listListingsFromMock(query) : listListingsFromDb(query);
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  return isUsingMockData() ? getListingFromMock(slug) : getListingFromDb(slug);
}

export async function listRegions(): Promise<RegionSummary[]> {
  return isUsingMockData() ? listRegionsFromMock() : listRegionsFromDb();
}

export type RegionSummary = {
  slug: Region;
  name: LocalizedText;
  coverImage: string | null;
  listingCount: number;
};

// ---------------------------------------------------------------------------
// Mock implementations — used until a DATABASE_URL is configured.
// ---------------------------------------------------------------------------

function queryToFilterState(query: ListingsQuery): ListingsFilterState {
  return {
    q: query.q ?? '',
    direction: query.direction as Direction[],
    type: query.type as PlaceType[],
    guests: query.guests ? (query.guests as ListingsFilterState['guests']) : null,
    placement: query.placement as ListingsFilterState['placement'],
    food: query.food as Meal[],
    extra: query.extra as Amenity[],
    basic: query.basic as Amenity[],
    fun: query.fun as Activity[],
  };
}

export function listListingsFromMock(query: ListingsQuery): ListListingsResult {
  const filterState = queryToFilterState(query);
  let results = applyListingsFilter(mockListings, filterState);

  // Apply legacy single-select filters that aren't part of ListingsFilterState.
  if (query.category) results = results.filter((l) => l.category === query.category);
  if (query.region) results = results.filter((l) => l.region === query.region);
  if (typeof query.price_min === 'number') {
    results = results.filter((l) => l.price >= query.price_min!);
  }
  if (typeof query.price_max === 'number') {
    results = results.filter((l) => l.price <= query.price_max!);
  }
  if (typeof query.capacity === 'number') {
    results = results.filter((l) => l.capacity >= query.capacity!);
  }
  if (query.amenities.length > 0) {
    results = results.filter((l) =>
      (query.amenities as Amenity[]).every((a) => l.amenities.includes(a)),
    );
  }

  const total = results.length;
  const sorted = sortListings(results, (query.sort as SortOption | undefined) ?? null);
  const start = (query.page - 1) * query.limit;
  const data = sorted.slice(start, start + query.limit);
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
  return mockListings.find((l) => l.slug === slug) ?? null;
}

export function listRegionsFromMock(): RegionSummary[] {
  const counts = new Map<Region, number>();
  for (const l of mockListings) counts.set(l.region, (counts.get(l.region) ?? 0) + 1);

  // Use the active filter count just to confirm the helper is wired (otherwise unused).
  void countActiveFilters;

  return Array.from(counts.entries()).map(([slug, listingCount]) => ({
    slug,
    name: { az: slug, ru: slug, en: slug },
    coverImage: null,
    listingCount,
  }));
}

// ---------------------------------------------------------------------------
// Prisma implementations — exported separately so tests can inject a mock.
// ---------------------------------------------------------------------------

const LISTING_INCLUDE = {
  region: true,
  amenities: { include: { amenity: true } },
  images: { orderBy: { order: 'asc' } },
} as const satisfies Prisma.ListingInclude;

type ListingRow = Prisma.ListingGetPayload<{ include: typeof LISTING_INCLUDE }>;

const PRISMA_TO_DTO_DIRECTION: Record<string, Direction> = {
  ISMAYILLI: 'ismayilli',
  GUBA: 'guba',
  LERIK: 'lerik',
  ZAGATALA: 'zagatala',
  OTHERS: 'others',
};

const PRISMA_TO_DTO_PLACE_TYPE: Record<string, PlaceType> = {
  A_FRAME: 'a-frame',
  VILLA_COTTAGE: 'villa-cottage',
  HOTEL: 'hotel',
  MODULAR: 'modular',
  VILLAGE_ROOM: 'village-room',
};

const PRISMA_TO_DTO_CATEGORY: Record<string, ListingCategory> = {
  MOUNTAIN: 'mountain',
  FOREST: 'forest',
  RIVER: 'river',
  SEA: 'sea',
  LAKE: 'lake',
};

const PRISMA_TO_DTO_MEAL: Record<string, Meal> = {
  BREAKFAST: 'breakfast',
  ON_REQUEST: 'on-request',
};

const PRISMA_TO_DTO_ACTIVITY: Record<string, Activity> = {
  QUAD: 'quad',
  HORSE: 'horse',
  FISHING: 'fishing',
};

const dtoToPrismaEnum = (value: string): string => value.toUpperCase().replace(/-/g, '_');

export function rowToDto(row: ListingRow): Listing {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title as unknown as LocalizedText,
    description: row.description as unknown as LocalizedText,
    region: row.region.slug as Region,
    direction: PRISMA_TO_DTO_DIRECTION[row.direction] ?? 'others',
    placeType: PRISMA_TO_DTO_PLACE_TYPE[row.placeType] ?? 'villa-cottage',
    category: PRISMA_TO_DTO_CATEGORY[row.category] ?? 'mountain',
    price: row.price,
    rating: row.rating,
    reviewCount: row.reviewCount,
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    images: row.images.map((img) => img.url),
    amenities: row.amenities.map((rel) => rel.amenity.slug as Amenity),
    meals: row.meals.map((m) => PRISMA_TO_DTO_MEAL[m] ?? 'breakfast'),
    activities: row.activities.map((a) => PRISMA_TO_DTO_ACTIVITY[a] ?? 'fishing'),
    location: { lat: row.lat, lng: row.lng, address: row.address },
    phone: row.phone ?? '',
    createdAt: row.createdAt.toISOString(),
  };
}

function buildWhere(query: ListingsQuery): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {};
  if (query.category) {
    where.category = dtoToPrismaEnum(query.category) as Prisma.ListingWhereInput['category'];
  }
  if (query.region) where.region = { slug: query.region };
  if (query.direction.length > 0) {
    where.direction = {
      in: query.direction.map(dtoToPrismaEnum),
    } as Prisma.ListingWhereInput['direction'];
  }
  if (query.type.length > 0) {
    where.placeType = {
      in: query.type.map(dtoToPrismaEnum),
    } as Prisma.ListingWhereInput['placeType'];
  }
  if (query.placement.length > 0) {
    const cats = new Set<string>();
    for (const p of query.placement) {
      if (p === 'forest') ['MOUNTAIN', 'FOREST'].forEach((c) => cats.add(c));
      else ['RIVER', 'SEA', 'LAKE'].forEach((c) => cats.add(c));
    }
    where.category = {
      in: Array.from(cats),
    } as Prisma.ListingWhereInput['category'];
  }
  if (query.food.length > 0) {
    where.AND = (where.AND ?? []) as Prisma.ListingWhereInput[];
    (where.AND as Prisma.ListingWhereInput[]).push({
      meals: { hasEvery: query.food.map(dtoToPrismaEnum) as never },
    });
  }
  if (query.fun.length > 0) {
    where.AND = (where.AND ?? []) as Prisma.ListingWhereInput[];
    (where.AND as Prisma.ListingWhereInput[]).push({
      activities: { hasEvery: query.fun.map(dtoToPrismaEnum) as never },
    });
  }
  const requiredAmenities = [...query.extra, ...query.basic, ...query.amenities];
  if (requiredAmenities.length > 0) {
    where.AND = (where.AND ?? []) as Prisma.ListingWhereInput[];
    for (const slug of new Set(requiredAmenities)) {
      (where.AND as Prisma.ListingWhereInput[]).push({
        amenities: { some: { amenity: { slug } } },
      });
    }
  }
  if (typeof query.price_min === 'number' || typeof query.price_max === 'number') {
    const priceFilter: Prisma.IntFilter = {};
    if (typeof query.price_min === 'number') priceFilter.gte = query.price_min;
    if (typeof query.price_max === 'number') priceFilter.lte = query.price_max;
    where.price = priceFilter;
  }
  if (typeof query.capacity === 'number') {
    where.capacity = { gte: query.capacity };
  }
  if (query.guests) {
    if (query.guests === 'lt5') where.capacity = { lt: 5 };
    else if (query.guests === '5to10') where.capacity = { gte: 5, lte: 10 };
    else where.capacity = { gt: 10 };
  }
  if (query.q) {
    where.OR = [
      { address: { contains: query.q, mode: 'insensitive' } },
      { title: { path: ['en'], string_contains: query.q } },
      { title: { path: ['ru'], string_contains: query.q } },
      { title: { path: ['az'], string_contains: query.q } },
    ];
  }
  return where;
}

function buildOrderBy(sort?: SortOption): Prisma.ListingOrderByWithRelationInput {
  switch (sort) {
    case 'price-asc':
      return { price: 'asc' };
    case 'price-desc':
      return { price: 'desc' };
    case 'rating':
      return { rating: 'desc' };
    case 'newest':
    default:
      return { createdAt: 'desc' };
  }
}

export async function listListingsFromDb(
  query: ListingsQuery,
  db: PrismaClient = defaultPrisma,
): Promise<ListListingsResult> {
  const where = buildWhere(query);
  const orderBy = buildOrderBy(query.sort as SortOption | undefined);
  const skip = (query.page - 1) * query.limit;

  const [rows, total] = await db.$transaction([
    db.listing.findMany({ where, orderBy, skip, take: query.limit, include: LISTING_INCLUDE }),
    db.listing.count({ where }),
  ]);

  return {
    data: rows.map(rowToDto),
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      hasMore: skip + rows.length < total,
    },
  };
}

export async function getListingFromDb(
  slug: string,
  db: PrismaClient = defaultPrisma,
): Promise<Listing | null> {
  const row = await db.listing.findUnique({ where: { slug }, include: LISTING_INCLUDE });
  return row ? rowToDto(row) : null;
}

export async function listRegionsFromDb(
  db: PrismaClient = defaultPrisma,
): Promise<RegionSummary[]> {
  const rows = await db.region.findMany({
    include: { _count: { select: { listings: true } } },
    orderBy: { slug: 'asc' },
  });
  return rows.map((r) => ({
    slug: r.slug as Region,
    name: r.name as unknown as LocalizedText,
    coverImage: r.coverImage,
    listingCount: r._count.listings,
  }));
}
