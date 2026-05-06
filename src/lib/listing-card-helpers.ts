import type { Listing, Amenity } from '@/types';

export type ListingBadge = 'topPick' | 'new' | null;

export function getListingBadge(listing: Listing): ListingBadge {
  if (listing.rating >= 4.85 && listing.reviewCount >= 100) return 'topPick';
  if (listing.reviewCount < 60) return 'new';
  return null;
}

export const AMENITY_PRIORITY: readonly Amenity[] = [
  'pool',
  'sauna',
  'fireplace',
  'bbq',
  'wifi',
  'parking',
  'kitchen',
  'heating',
  'ac',
  'tv',
  'washer',
  'pets',
] as const;

export function pickTopAmenities(amenities: Amenity[], count: number): Amenity[] {
  const set = new Set(amenities);
  const result: Amenity[] = [];
  for (const a of AMENITY_PRIORITY) {
    if (result.length >= count) break;
    if (set.has(a)) result.push(a);
  }
  return result;
}
