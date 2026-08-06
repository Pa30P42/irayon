import { mockListings } from '@/data/mock-listings';
import { prisma as defaultPrisma } from '@/lib/prisma';
import type {
  Activity,
  Listing,
  ListingCategory,
  ListingStatus,
  Meal,
  PlaceType,
  RegionSummary,
  RegionWithVillages,
  SortOption,
  Village,
} from '@/types';
import { $Enums, type Prisma, type PrismaClient } from '@prisma/client';
import { LISTING_INCLUDE, rowToDto } from './listing-dto';
import type { CreateListingInput } from './listings-create-validator';
import type { ListListingsResult } from './listings-service-mock';
import type { ListingsQuery } from './listings-validator';
import { parseLocalized } from './localized-text';
import { toActivity, toCategory, toListingStatus, toMeal, toPlaceType } from './prisma-enums';

/**
 * Visibility gate for every public read. Apply anywhere a listing reaches an
 * unauthenticated surface (catalogue, detail, sitemap, static params) so
 * drafts/archived rows never leak.
 */
export const publicListingWhere = { status: $Enums.ListingStatus.PUBLISHED } as const;

/**
 * Status scope for service reads. Public callers get the default
 * (`'published'`); the admin API passes an explicit status or `'all'`.
 */
export type ListingStatusScope = ListingStatus | 'all';

const statusWhere = (scope: ListingStatusScope): Prisma.ListingWhereInput =>
  scope === 'all' ? {} : { status: toListingStatus(scope) };

/**
 * Prisma-backed implementations of the listings service. Exported separately
 * from the service surface so tests can call them with a `DeepMockProxy`
 * `PrismaClient` instead of standing up a real DB.
 */

function buildWhere(
  query: ListingsQuery,
  status: ListingStatusScope = 'published',
): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { ...statusWhere(status) };
  // `categories` is an enum array on Postgres; `hasSome` translates to the
  // `&&` overlap operator, so the listing matches if any of its categories
  // appears in the filter list.
  if (query.category.length > 0) {
    where.categories = {
      hasSome: (query.category as ListingCategory[]).map(toCategory),
    };
  }
  // Location: OR(region, village). Pushed under AND so it composes with the
  // other filters (food, fun, amenities) that already build their own AND[].
  if (query.region.length > 0 || query.village.length > 0) {
    const locationOr: Prisma.ListingWhereInput[] = [];
    if (query.region.length > 0) {
      locationOr.push({ region: { slug: { in: query.region } } });
    }
    if (query.village.length > 0) {
      locationOr.push({ village: { slug: { in: query.village } } });
    }
    where.AND = (where.AND ?? []) as Prisma.ListingWhereInput[];
    (where.AND as Prisma.ListingWhereInput[]).push({ OR: locationOr });
  }
  if (query.type.length > 0) {
    where.placeType = { in: (query.type as PlaceType[]).map(toPlaceType) };
  }
  if (query.placement.length > 0) {
    const cats = new Set<$Enums.ListingCategory>();
    for (const p of query.placement) {
      if (p === 'forest') {
        cats.add($Enums.ListingCategory.MOUNTAIN);
        cats.add($Enums.ListingCategory.FOREST);
      } else {
        cats.add($Enums.ListingCategory.RIVER);
        cats.add($Enums.ListingCategory.SEA);
        cats.add($Enums.ListingCategory.LAKE);
      }
    }
    // Compose with an explicit `categories` filter (above) by stacking under AND
    // rather than overwriting it.
    where.AND = (where.AND ?? []) as Prisma.ListingWhereInput[];
    (where.AND as Prisma.ListingWhereInput[]).push({
      categories: { hasSome: Array.from(cats) },
    });
  }
  if (query.food.length > 0) {
    where.AND = (where.AND ?? []) as Prisma.ListingWhereInput[];
    (where.AND as Prisma.ListingWhereInput[]).push({
      meals: { hasEvery: (query.food as Meal[]).map(toMeal) },
    });
  }
  if (query.fun.length > 0) {
    where.AND = (where.AND ?? []) as Prisma.ListingWhereInput[];
    (where.AND as Prisma.ListingWhereInput[]).push({
      activities: { hasEvery: (query.fun as Activity[]).map(toActivity) },
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
  status: ListingStatusScope = 'published',
): Promise<ListListingsResult> {
  const where = buildWhere(query, status);
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
  // findFirst (not findUnique) so the public visibility gate composes with
  // the unique slug lookup — drafts/archived listings 404 publicly.
  const row = await db.listing.findFirst({
    where: { slug, ...publicListingWhere },
    include: LISTING_INCLUDE,
  });
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
  useMockData: boolean = false,
): Promise<ListingImageRef[]> {
  if (useMockData) {
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
        placeType: toPlaceType(input.placeType as PlaceType),
        status: toListingStatus(input.status as ListingStatus),
        categories: { set: (input.categories as ListingCategory[]).map(toCategory) },
        price: input.price,
        capacity: input.capacity,
        bedrooms: input.bedrooms,
        lat: input.lat,
        lng: input.lng,
        address: input.address,
        phone: input.phone,
        meals: { set: (input.meals as Meal[]).map(toMeal) },
        activities: { set: (input.activities as Activity[]).map(toActivity) },
        ...(amenityRows.length > 0
          ? { amenities: { create: amenityRows.map((a) => ({ amenityId: a.id })) } }
          : {}),
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
    name: parseLocalized(r.name),
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
    name: parseLocalized(r.name),
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
      name: parseLocalized(v.name),
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
    name: parseLocalized(v.name),
    sortOrder: v.sortOrder,
  }));
}

export type DeleteListingResult = {
  deleted: boolean;
  /** Slug of the removed listing, so callers can revalidate its detail pages. */
  slug: string | null;
  storageRemoved: number;
  storageFailed: number;
};

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
  const removed = await db.listing.delete({ where: { id }, select: { slug: true } });

  let storageRemoved = 0;
  let storageFailed = 0;
  const settled = await Promise.allSettled(images.map((img) => removeFromStorage(img.url)));
  for (const r of settled) {
    if (r.status === 'fulfilled') storageRemoved += 1;
    else storageFailed += 1;
  }

  return { deleted: true, slug: removed.slug, storageRemoved, storageFailed };
}
