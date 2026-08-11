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
import { LISTING_CARD_SELECT, LISTING_DETAIL_SELECT, rowToCardDto, rowToDto } from './listing-dto';
import { normalizeCoordinate } from './listing-moderation';
import { buildListingSearchText } from './listing-search-text';
import type { CreateListingInput } from './listings-create-validator';
import type { ListListingsResult } from './listings-service-mock';
import type { ListingsQuery } from './listings-validator';
import { parseLocalized } from './localized-text';
import { toActivity, toCategory, toListingStatus, toMeal, toPlaceType } from './prisma-enums';

/**
 * Visibility gate for every public read — the single choke point that makes
 * moderation unbypassable. Apply anywhere a listing reaches an unauthenticated
 * surface (catalogue, detail, sitemap, static params).
 *
 * Two INDEPENDENT conditions, and both are required:
 *   - `status: PUBLISHED`   — the host's lifecycle intent (vs draft/archived);
 *   - `moderationStatus: APPROVED` — the platform's gate.
 *
 * Keeping them as separate columns is what lets a host unpublish instantly
 * without losing their approval, and lets a moderator reject without touching
 * the host's own draft/publish state. Two small state machines beat one
 * nine-state machine.
 */
export const publicListingWhere = {
  status: $Enums.ListingStatus.PUBLISHED,
  moderationStatus: $Enums.ModerationStatus.APPROVED,
} as const;

/**
 * Status scope for service reads. Public callers get the default
 * (`'published'`); the admin API passes an explicit status or `'all'`.
 */
export type ListingStatusScope = ListingStatus | 'all';

/**
 * What a caller is allowed to see.
 *
 * `approvedOnly` defaults to TRUE — fail closed. A future read path that
 * forgets to think about moderation gets the safe answer (approved rows only)
 * rather than silently publishing a listing nobody reviewed. Only the admin and
 * host cabinets opt out, and each for a stated reason.
 */
export type ListingReadScope = {
  status?: ListingStatusScope;
  approvedOnly?: boolean;
  /** Restrict to one host's own listings (host cabinet). */
  hostId?: string;
};

const PUBLIC_SCOPE: ListingReadScope = { status: 'published', approvedOnly: true };

const scopeWhere = (scope: ListingReadScope): Prisma.ListingWhereInput => {
  const where: Prisma.ListingWhereInput = {};
  const status = scope.status ?? 'published';
  if (status !== 'all') where.status = toListingStatus(status);
  if (scope.approvedOnly !== false) {
    where.moderationStatus = $Enums.ModerationStatus.APPROVED;
  }
  if (scope.hostId) where.hostId = scope.hostId;
  return where;
};

/**
 * Prisma-backed implementations of the listings service. Exported separately
 * from the service surface so tests can call them with a `DeepMockProxy`
 * `PrismaClient` instead of standing up a real DB.
 */

function buildWhere(
  query: ListingsQuery,
  scope: ListingReadScope = PUBLIC_SCOPE,
): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { ...scopeWhere(scope) };
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
    // Single ILIKE over the denormalized search_text (titles ×3 + address),
    // served by its trigram GIN index — replaces the old 4-arm OR that
    // seq-scanned three JSONB paths per request.
    where.searchText = { contains: query.q.toLowerCase() };
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
  scope: ListingReadScope = PUBLIC_SCOPE,
): Promise<ListListingsResult> {
  const where = buildWhere(query, scope);
  const orderBy = buildOrderBy(query.sort as SortOption | undefined);
  const skip = (query.page - 1) * query.limit;

  // Promise.all, not $transaction: a transaction serializes both scans on one
  // connection, and a catalogue count doesn't need snapshot consistency.
  const [rows, total] = await Promise.all([
    db.listing.findMany({ where, orderBy, skip, take: query.limit, select: LISTING_CARD_SELECT }),
    db.listing.count({ where }),
  ]);

  return {
    data: rows.map(rowToCardDto),
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      hasMore: skip + rows.length < total,
    },
  };
}

export type ListingSlugRef = { slug: string; createdAt: Date };

/**
 * Newest-first slugs of published listings. Feeds generateStaticParams and
 * the sitemap, which only need slugs — not 1000 fully-hydrated rows.
 */
export async function listListingSlugsFromDb(
  limit?: number,
  db: PrismaClient = defaultPrisma,
): Promise<ListingSlugRef[]> {
  return db.listing.findMany({
    where: publicListingWhere,
    select: { slug: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  });
}

export async function getListingFromDb(
  slug: string,
  db: PrismaClient = defaultPrisma,
): Promise<Listing | null> {
  // findFirst (not findUnique) so the public visibility gate composes with
  // the unique slug lookup — drafts/archived listings 404 publicly.
  const row = await db.listing.findFirst({
    where: { slug, ...publicListingWhere },
    select: LISTING_DETAIL_SELECT,
  });
  return row ? rowToDto(row) : null;
}

export async function getListingByIdFromDb(
  id: string,
  db: PrismaClient = defaultPrisma,
): Promise<Listing | null> {
  const row = await db.listing.findUnique({ where: { id }, select: LISTING_DETAIL_SELECT });
  return row ? rowToDto(row) : null;
}

export type ListingImageRef = {
  id: string;
  url: string;
  /**
   * Carried so the host/admin edit grid can badge a photo as awaiting review
   * (or awaiting removal) instead of pretending every photo is already live.
   */
  moderationState: $Enums.ImageModerationState;
};

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
    return listing.images.map((url, idx) => ({
      id: `${id}-img-${idx}`,
      url,
      moderationState: $Enums.ImageModerationState.LIVE,
    }));
  }
  // No state filter: the edit grid is the HOST-VISIBLE set, which includes
  // photos awaiting review in both directions. The stale-set guard on reorder
  // operates over this same set.
  const rows = await db.image.findMany({
    where: { listingId: id },
    orderBy: { order: 'asc' },
    select: { id: true, url: true, moderationState: true },
  });
  return rows;
}

/**
 * Extra control the moderation-aware wrapper needs. Kept as options on the one
 * existing update function rather than a second, parallel write path — two
 * write paths for the same table is how the admin and host flows would drift
 * apart, which is the exact failure the shared service exists to prevent.
 */
export type UpdateListingOptions = {
  /**
   * Significant fields to leave UNTOUCHED because they are being parked in
   * `pendingChanges` instead. Everything not listed still applies live.
   */
  omitFields?: readonly string[];
  /** Moderation columns to write alongside the content (actor-dependent). */
  moderationData?: Prisma.ListingUpdateInput;
};

export async function updateListingFromDb(
  id: string,
  input: CreateListingInput,
  db: PrismaClient = defaultPrisma,
  options: UpdateListingOptions = {},
): Promise<Listing | null> {
  // The three lookups are independent — fan them out. The village→region
  // ownership check happens after both rows are back.
  const [region, village, amenityRows] = await Promise.all([
    db.region.findUnique({ where: { slug: input.region }, select: { id: true } }),
    input.villageId
      ? db.village.findUnique({ where: { id: input.villageId }, select: { regionId: true } })
      : Promise.resolve(null),
    input.amenities.length > 0
      ? db.amenity.findMany({
          where: { slug: { in: input.amenities } },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
  ]);
  if (!region) return null;

  // If the form supplied a village, verify it belongs to the chosen region.
  // Cross-region mismatches default to null rather than error — keeps the
  // listing editable instead of bouncing users with a hard validation fail.
  const villageId =
    input.villageId && village && village.regionId === region.id ? input.villageId : null;

  const omit = new Set(options.omitFields ?? []);
  const title = {
    az: input.title.az || input.title.en,
    ru: input.title.ru || input.title.en,
    en: input.title.en,
  };

  const data: Prisma.ListingUpdateInput = {
    // Never significant — these always apply live.
    status: toListingStatus(input.status as ListingStatus),
    categories: { set: (input.categories as ListingCategory[]).map(toCategory) },
    price: input.price,
    capacity: input.capacity,
    bedrooms: input.bedrooms,
    meals: { set: (input.meals as Meal[]).map(toMeal) },
    activities: { set: (input.activities as Activity[]).map(toActivity) },
    ...(amenityRows.length > 0
      ? { amenities: { create: amenityRows.map((a) => ({ amenityId: a.id })) } }
      : {}),
    ...options.moderationData,
  };

  // Significant fields — written only when they aren't parked in pendingChanges.
  if (!omit.has('title')) {
    data.title = title as Prisma.InputJsonValue;
  }
  if (!omit.has('description')) {
    data.description = {
      az: input.description.az || input.description.en,
      ru: input.description.ru || input.description.en,
      en: input.description.en,
    } as Prisma.InputJsonValue;
  }
  if (!omit.has('address')) data.address = input.address;
  if (!omit.has('region')) data.region = { connect: { id: region.id } };
  if (!omit.has('villageId')) {
    data.village = villageId ? { connect: { id: villageId } } : { disconnect: true };
  }
  if (!omit.has('placeType')) data.placeType = toPlaceType(input.placeType as PlaceType);
  // Normalise on WRITE at the same precision the comparison uses, so a stored
  // value and a compared value can never diverge by float noise.
  if (!omit.has('lat')) data.lat = normalizeCoordinate(input.lat);
  if (!omit.has('lng')) data.lng = normalizeCoordinate(input.lng);
  if (!omit.has('phone')) data.phone = input.phone;

  // `searchText` is derived from title + address, and it feeds the PUBLIC search
  // index. Rebuild it only when BOTH inputs are applying live — with `||` here,
  // a host whose title edit is queued but whose address is unchanged would have
  // the queued title written into the index, so the listing would surface under
  // a title its own page doesn't show yet. When either half is parked, the
  // existing searchText already matches the live content and must stay.
  if (!omit.has('title') && !omit.has('address')) {
    data.searchText = buildListingSearchText(title, input.address);
  }

  const [, fresh] = await db.$transaction([
    db.listingAmenity.deleteMany({ where: { listingId: id } }),
    db.listing.update({
      where: { id },
      data,
      // Return the fresh row from the write itself — no follow-up read.
      select: LISTING_DETAIL_SELECT,
    }),
  ]);

  return rowToDto(fresh);
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

/** Returns `null` when the region doesn't exist (callers map that to 404). */
export async function listVillagesByRegionSlug(
  regionSlug: string,
  db: PrismaClient = defaultPrisma,
): Promise<Village[] | null> {
  const region = await db.region.findUnique({
    where: { slug: regionSlug },
    select: { id: true, slug: true },
  });
  if (!region) return null;
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
