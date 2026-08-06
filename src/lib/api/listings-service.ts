import { mockListings } from '@/data/mock-listings';
import type { Listing, RegionSummary, RegionWithVillages } from '@/types';
import type { CreateListingInput } from './listings-create-validator';
import {
  deleteListingFromDb,
  getListingByIdFromDb,
  getListingFromDb,
  getListingImagesById as getListingImagesByIdFromDb,
  listListingsFromDb,
  listRegionsFromDb,
  listRegionsWithVillagesFromDb,
  listVillagesByRegionSlug as listVillagesByRegionSlugFromDb,
  updateListingFromDb,
  type DeleteListingResult,
  type ListingImageRef,
  type ListingStatusScope,
} from './listings-service-db';
import {
  getListingFromMock,
  listListingsFromMock,
  listRegionsFromMock,
  listRegionsWithVillagesFromMock,
  type ListListingsResult,
} from './listings-service-mock';
import type { ListingsQuery } from './listings-validator';

/**
 * Public surface of the listings service. Routes calls to the Prisma path
 * when `DATABASE_URL` is set, otherwise to the in-memory mock path that
 * keeps the dev environment running without a DB.
 *
 * Internals split across:
 *   - `listing-dto.ts`           — `rowToDto`, Prisma include shape, enum maps
 *   - `listings-service-db.ts`   — Prisma implementations
 *   - `listings-service-mock.ts` — mock implementations
 *
 * Test-only symbols (`*FromDb` / `*FromMock` / `rowToDto`) are re-exported
 * here so existing imports keep working.
 */

export const isUsingMockData = (): boolean =>
  !process.env.DATABASE_URL || process.env.DATABASE_URL === '';

/**
 * Public reads default to `'published'` rows only. The admin API is the only
 * caller that widens the scope (specific status or `'all'`).
 */
export async function listListings(
  query: ListingsQuery,
  status: ListingStatusScope = 'published',
): Promise<ListListingsResult> {
  return isUsingMockData()
    ? listListingsFromMock(query, status)
    : listListingsFromDb(query, undefined, status);
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

export async function getListingImagesById(id: string): Promise<ListingImageRef[]> {
  return getListingImagesByIdFromDb(id, undefined, isUsingMockData());
}

export async function listVillagesByRegionSlug(regionSlug: string) {
  // Mock path returns an empty array — `listRegionsFromMock` doesn't carry
  // villages either, so the cascade hides on the public filter modal.
  if (isUsingMockData()) return [];
  return listVillagesByRegionSlugFromDb(regionSlug);
}

/**
 * Deletes a listing (and its image / amenity rows via DB cascade), then
 * best-effort removes any of its images that live in our storage bucket.
 */
export async function deleteListing(id: string): Promise<DeleteListingResult> {
  if (isUsingMockData()) {
    const listing = mockListings.find((l) => l.id === id);
    return { deleted: true, slug: listing?.slug ?? null, storageRemoved: 0, storageFailed: 0 };
  }
  return deleteListingFromDb(id);
}

// Re-exports kept for test imports and any external callers that reach for
// the underlying implementations directly.
export { rowToDto } from './listing-dto';
export {
  deleteListingFromDb,
  getListingByIdFromDb,
  getListingFromDb,
  listListingsFromDb,
  listRegionsFromDb,
  listRegionsWithVillagesFromDb,
  publicListingWhere,
  updateListingFromDb,
  type DeleteListingResult,
  type ListingImageRef,
  type ListingStatusScope,
} from './listings-service-db';
export {
  getListingFromMock,
  listListingsFromMock,
  listRegionsFromMock,
  listRegionsWithVillagesFromMock,
  type ListListingsResult,
} from './listings-service-mock';
