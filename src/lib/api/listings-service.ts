import { mockListings } from '@/data/mock-listings';
import { applyListingsFilter, sortListings } from '@/lib/listings-filter';
import { prisma as defaultPrisma } from '@/lib/prisma';
import type {
  Activity,
  Amenity,
  Listing,
  ListingCategory,
  ListingsFilterState,
  LocalizedText,
  Meal,
  PlaceType,
  RegionSummary,
  RegionWithVillages,
  SortOption,
  Village,
} from '@/types';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { CreateListingInput } from './listings-create-validator';
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

export async function getListingById(id: string): Promise<Listing | null> {
  if (isUsingMockData()) return mockListings.find((l) => l.id === id) ?? null;
  return getListingByIdFromDb(id);
}

export async function updateListing(
  id: string,
  input: CreateListingInput,
): Promise<Listing | null> {
  if (isUsingMockData()) return mockListings.find((l) => l.id === id) ?? null;
  return updateListingFromDb(id, input);
}

export async function listRegions(): Promise<RegionSummary[]> {
  return isUsingMockData() ? listRegionsFromMock() : listRegionsFromDb();
}

export async function listRegionsWithVillages(): Promise<RegionWithVillages[]> {
  return isUsingMockData() ? listRegionsWithVillagesFromMock() : listRegionsWithVillagesFromDb();
}

export type DeleteListingResult = {
  deleted: boolean;
  storageRemoved: number;
  storageFailed: number;
};

/**
 * Deletes a listing (and its image / amenity rows via DB cascade), then
 * best-effort removes any of its images that live in our storage bucket.
 */
export async function deleteListing(id: string): Promise<DeleteListingResult> {
  if (isUsingMockData()) {
    return { deleted: true, storageRemoved: 0, storageFailed: 0 };
  }
  return deleteListingFromDb(id);
}

// ---------------------------------------------------------------------------
// Mock implementations — used until a DATABASE_URL is configured.
// ---------------------------------------------------------------------------

function queryToFilterState(query: ListingsQuery): ListingsFilterState {
  return {
    q: query.q ?? '',
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

export function listListingsFromMock(query: ListingsQuery): ListListingsResult {
  const filterState = queryToFilterState(query);
  let results = applyListingsFilter(mockListings, filterState);

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

// ---------------------------------------------------------------------------
// Prisma implementations — exported separately so tests can inject a mock.
// ---------------------------------------------------------------------------

const LISTING_INCLUDE = {
  region: true,
  village: true,
  amenities: { include: { amenity: true } },
  images: { orderBy: { order: 'asc' } },
} as const satisfies Prisma.ListingInclude;

type ListingRow = Prisma.ListingGetPayload<{ include: typeof LISTING_INCLUDE }>;

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
    region: row.region.slug,
    regionName: row.region.name as unknown as LocalizedText,
    villageId: row.villageId,
    villageSlug: row.village?.slug ?? null,
    villageName: row.village ? (row.village.name as unknown as LocalizedText) : null,
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
  if (query.village.length > 0) {
    where.village = { slug: { in: query.village } };
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

export async function getListingByIdFromDb(
  id: string,
  db: PrismaClient = defaultPrisma,
): Promise<Listing | null> {
  const row = await db.listing.findUnique({ where: { id }, include: LISTING_INCLUDE });
  return row ? rowToDto(row) : null;
}

export type ListingImageRef = { id: string; url: string };

/**
 * Returns image rows with their ids — needed by the admin edit flow so each
 * thumbnail can target the per-image DELETE endpoint. Public DTOs only carry
 * URLs because clients have no business addressing individual rows.
 */
export async function getListingImagesById(
  id: string,
  db: PrismaClient = defaultPrisma,
): Promise<ListingImageRef[]> {
  if (isUsingMockData()) {
    const listing = mockListings.find((l) => l.id === id);
    if (!listing) return [];
    return listing.images.map((url, idx) => ({ id: `${id}-img-${idx}`, url }));
  }
  const rows = await db.image.findMany({
    where: { listingId: id },
    orderBy: { order: 'asc' },
    select: { id: true, url: true },
  });
  return rows;
}

export async function updateListingFromDb(
  id: string,
  input: CreateListingInput,
  db: PrismaClient = defaultPrisma,
): Promise<Listing | null> {
  const region = await db.region.findUnique({
    where: { slug: input.region },
    select: { id: true },
  });
  if (!region) return null;

  // If the form supplied a village, verify it belongs to the chosen region.
  // Cross-region mismatches default to null rather than error — keeps the
  // listing editable instead of bouncing users with a hard validation fail.
  let villageId: string | null = null;
  if (input.villageId) {
    const village = await db.village.findUnique({
      where: { id: input.villageId },
      select: { regionId: true },
    });
    if (village && village.regionId === region.id) {
      villageId = input.villageId;
    }
  }

  const amenityRows =
    input.amenities.length > 0
      ? await db.amenity.findMany({
          where: { slug: { in: input.amenities } },
          select: { id: true, slug: true },
        })
      : [];

  await db.$transaction([
    db.listingAmenity.deleteMany({ where: { listingId: id } }),
    db.listing.update({
      where: { id },
      data: {
        title: {
          az: input.title.az || input.title.en,
          ru: input.title.ru || input.title.en,
          en: input.title.en,
        } as Prisma.InputJsonValue,
        description: {
          az: input.description.az || input.description.en,
          ru: input.description.ru || input.description.en,
          en: input.description.en,
        } as Prisma.InputJsonValue,
        regionId: region.id,
        villageId,
        placeType: dtoToPrismaEnum(input.placeType) as Prisma.ListingUpdateInput['placeType'],
        category: dtoToPrismaEnum(input.category) as Prisma.ListingUpdateInput['category'],
        price: input.price,
        capacity: input.capacity,
        bedrooms: input.bedrooms,
        lat: input.lat,
        lng: input.lng,
        address: input.address,
        phone: input.phone,
        meals: { set: input.meals.map(dtoToPrismaEnum) as never },
        activities: { set: input.activities.map(dtoToPrismaEnum) as never },
        amenities:
          amenityRows.length > 0
            ? { create: amenityRows.map((a) => ({ amenityId: a.id })) }
            : undefined,
      },
    }),
  ]);

  const fresh = await db.listing.findUnique({ where: { id }, include: LISTING_INCLUDE });
  return fresh ? rowToDto(fresh) : null;
}

const REGION_LIST_ORDER_BY: Prisma.RegionOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { slug: 'asc' },
];

export async function listRegionsFromDb(
  db: PrismaClient = defaultPrisma,
): Promise<RegionSummary[]> {
  const rows = await db.region.findMany({
    include: { _count: { select: { listings: true, villages: true } } },
    orderBy: REGION_LIST_ORDER_BY,
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name as unknown as LocalizedText,
    coverImage: r.coverImage,
    featured: r.featured,
    sortOrder: r.sortOrder,
    listingCount: r._count.listings,
    villageCount: r._count.villages,
  }));
}

export async function listRegionsWithVillagesFromDb(
  db: PrismaClient = defaultPrisma,
): Promise<RegionWithVillages[]> {
  const rows = await db.region.findMany({
    include: {
      _count: { select: { listings: true, villages: true } },
      villages: { orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }] },
    },
    orderBy: REGION_LIST_ORDER_BY,
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name as unknown as LocalizedText,
    coverImage: r.coverImage,
    featured: r.featured,
    sortOrder: r.sortOrder,
    listingCount: r._count.listings,
    villageCount: r._count.villages,
    villages: r.villages.map((v) => ({
      id: v.id,
      slug: v.slug,
      regionId: v.regionId,
      regionSlug: r.slug,
      name: v.name as unknown as LocalizedText,
      sortOrder: v.sortOrder,
    })),
  }));
}

export async function listVillagesByRegionSlug(
  regionSlug: string,
  db: PrismaClient = defaultPrisma,
): Promise<Village[]> {
  const region = await db.region.findUnique({
    where: { slug: regionSlug },
    select: { id: true, slug: true },
  });
  if (!region) return [];
  const rows = await db.village.findMany({
    where: { regionId: region.id },
    orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
  });
  return rows.map((v) => ({
    id: v.id,
    slug: v.slug,
    regionId: v.regionId,
    regionSlug: region.slug,
    name: v.name as unknown as LocalizedText,
    sortOrder: v.sortOrder,
  }));
}

export async function deleteListingFromDb(
  id: string,
  db: PrismaClient = defaultPrisma,
  removeFromStorage: (url: string) => Promise<unknown> = (url) =>
    import('@/lib/storage').then((m) => m.deleteListingImageByUrl(url)),
): Promise<DeleteListingResult> {
  // Snapshot the URLs before the cascade wipes them.
  const images = await db.image.findMany({
    where: { listingId: id },
    select: { url: true },
  });

  // Throws (P2025) if the listing doesn't exist — the route handler maps that to 404.
  await db.listing.delete({ where: { id } });

  let storageRemoved = 0;
  let storageFailed = 0;
  const settled = await Promise.allSettled(images.map((img) => removeFromStorage(img.url)));
  for (const r of settled) {
    if (r.status === 'fulfilled') storageRemoved += 1;
    else storageFailed += 1;
  }

  return { deleted: true, storageRemoved, storageFailed };
}
