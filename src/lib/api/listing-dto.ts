import type { Activity, Amenity, Listing, ListingCategory, Meal, PlaceType } from '@/types';
import type { Prisma } from '@prisma/client';
import { parseLocalized } from './localized-text';

/**
 * Prisma include shape for a fully-hydrated listing row. Used everywhere the
 * service returns a `Listing` DTO so the row type stays consistent.
 */
export const LISTING_INCLUDE = {
  region: true,
  village: true,
  amenities: { include: { amenity: true } },
  images: { orderBy: { order: 'asc' } },
} as const satisfies Prisma.ListingInclude;

export type ListingRow = Prisma.ListingGetPayload<{ include: typeof LISTING_INCLUDE }>;

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

export function rowToDto(row: ListingRow): Listing {
  return {
    id: row.id,
    slug: row.slug,
    title: parseLocalized(row.title),
    description: parseLocalized(row.description),
    region: row.region.slug,
    regionName: parseLocalized(row.region.name),
    villageId: row.villageId,
    villageSlug: row.village?.slug ?? null,
    villageName: row.village ? parseLocalized(row.village.name) : null,
    placeType: PRISMA_TO_DTO_PLACE_TYPE[row.placeType] ?? 'villa-cottage',
    categories: row.categories.map((c) => PRISMA_TO_DTO_CATEGORY[c] ?? 'mountain'),
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
