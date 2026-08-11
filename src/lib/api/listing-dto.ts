import type {
  Activity,
  Amenity,
  Listing,
  ListingCardDto,
  ListingCategory,
  ListingStatus,
  Meal,
  PlaceType,
} from '@/types';
import { $Enums, type Prisma } from '@prisma/client';
import { parseLocalized } from './localized-text';

/**
 * Prisma select shapes for the two listing read paths.
 *
 * - `LISTING_CARD_SELECT` — list/card surfaces. No 3-locale description
 *   (cards never render it), first image only (+ `_count` so the admin list
 *   can show a real photo count), and slug/name-only relations.
 * - `LISTING_DETAIL_SELECT` — detail/edit surfaces. Full scalars, but the
 *   relations are still trimmed to what `rowToDto` actually reads.
 *
 * Both use `satisfies Prisma.ListingSelect` + `Prisma.ListingGetPayload` so
 * a dropped field fails typecheck in the mapper instead of at runtime.
 */

const CARD_SCALARS = {
  id: true,
  slug: true,
  title: true,
  villageId: true,
  placeType: true,
  status: true,
  categories: true,
  price: true,
  rating: true,
  reviewCount: true,
  capacity: true,
  bedrooms: true,
  lat: true,
  lng: true,
  address: true,
  phone: true,
  meals: true,
  activities: true,
  createdAt: true,
} as const satisfies Prisma.ListingSelect;

const RELATION_SELECTS = {
  region: { select: { slug: true, name: true } },
  village: { select: { slug: true, name: true } },
  amenities: { select: { amenity: { select: { slug: true } } } },
} as const satisfies Prisma.ListingSelect;

/**
 * Which photos a rendered listing may show.
 *
 * `PENDING_ADD` is excluded — it is unreviewed content and must not reach a
 * page. `PENDING_REMOVE` is INCLUDED — it is approved content whose removal
 * hasn't been reviewed yet, and hiding it on request would let a host empty a
 * live listing without anyone approving that.
 *
 * Filter first, sort second: `order` is shared across all states, so a hidden
 * `PENDING_ADD` sitting at position 0 simply doesn't appear and the remaining
 * photos keep their relative order.
 */
const VISIBLE_IMAGE_WHERE = {
  moderationState: {
    in: [$Enums.ImageModerationState.LIVE, $Enums.ImageModerationState.PENDING_REMOVE],
  },
} as const satisfies Prisma.ImageWhereInput;

export const LISTING_CARD_SELECT = {
  ...CARD_SCALARS,
  ...RELATION_SELECTS,
  images: { select: { url: true }, where: VISIBLE_IMAGE_WHERE, orderBy: { order: 'asc' }, take: 1 },
  _count: { select: { images: { where: VISIBLE_IMAGE_WHERE } } },
} as const satisfies Prisma.ListingSelect;

export const LISTING_DETAIL_SELECT = {
  ...CARD_SCALARS,
  ...RELATION_SELECTS,
  description: true,
  images: { select: { url: true }, where: VISIBLE_IMAGE_WHERE, orderBy: { order: 'asc' } },
} as const satisfies Prisma.ListingSelect;

export type ListingCardRow = Prisma.ListingGetPayload<{ select: typeof LISTING_CARD_SELECT }>;
export type ListingRow = Prisma.ListingGetPayload<{ select: typeof LISTING_DETAIL_SELECT }>;

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

const PRISMA_TO_DTO_STATUS: Record<string, ListingStatus> = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

/** Row fields shared by the card and detail selects. */
type CommonRow = Omit<ListingCardRow, 'images' | '_count'>;

/** Fields shared by the card and detail mappers. */
function rowToCommonDto(row: CommonRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: parseLocalized(row.title),
    region: row.region.slug,
    regionName: parseLocalized(row.region.name),
    villageId: row.villageId,
    villageSlug: row.village?.slug ?? null,
    villageName: row.village ? parseLocalized(row.village.name) : null,
    placeType: PRISMA_TO_DTO_PLACE_TYPE[row.placeType] ?? 'villa-cottage',
    status: PRISMA_TO_DTO_STATUS[row.status] ?? 'published',
    categories: row.categories.map((c) => PRISMA_TO_DTO_CATEGORY[c] ?? 'mountain'),
    price: row.price,
    rating: row.rating,
    reviewCount: row.reviewCount,
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    amenities: row.amenities.map((rel) => rel.amenity.slug as Amenity),
    meals: row.meals.map((m) => PRISMA_TO_DTO_MEAL[m] ?? 'breakfast'),
    activities: row.activities.map((a) => PRISMA_TO_DTO_ACTIVITY[a] ?? 'fishing'),
    location: { lat: row.lat, lng: row.lng, address: row.address },
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
  };
}

export function rowToCardDto(row: ListingCardRow): ListingCardDto {
  return {
    ...rowToCommonDto(row),
    images: row.images.map((img) => img.url),
    imageCount: row._count.images,
  };
}

export function rowToDto(row: ListingRow): Listing {
  return {
    ...rowToCommonDto(row),
    description: parseLocalized(row.description),
    images: row.images.map((img) => img.url),
  };
}

/** Project a full DTO into the card shape (mock path / fixtures). */
export function listingToCard(listing: Listing): ListingCardDto {
  const { description: _description, ...rest } = listing;
  return {
    ...rest,
    images: listing.images.slice(0, 1),
    imageCount: listing.images.length,
  };
}
