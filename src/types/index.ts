import type { Locale } from '@/i18n/routing';

export type LocalizedText = {
  az: string;
  ru: string;
  en: string;
};

export type ListingCategory = 'mountain' | 'forest' | 'river' | 'sea' | 'lake';

export type Coordinates = {
  lat: number;
  lng: number;
};

export type ListingLocation = Coordinates & {
  address: string;
};

export type Amenity =
  | 'wifi'
  | 'parking'
  | 'pool'
  | 'sauna'
  | 'jacuzzi'
  | 'fireplace'
  | 'kitchen'
  | 'bbq'
  | 'pets'
  | 'heating'
  | 'ac'
  | 'tv'
  | 'washer'
  | 'iron'
  | 'hairdryer'
  | 'crib'
  | 'kids'
  | 'ev-charger';

/**
 * Region slugs are now data-driven (admin can add/edit/remove). This is a
 * plain `string` to avoid baking the catalogue into the type system.
 */
export type Region = string;

export type Village = {
  id: string;
  slug: string;
  regionId: string;
  /** Convenience: parent region's slug, denormalized into the DTO. */
  regionSlug: string;
  name: LocalizedText;
  sortOrder: number;
};

export type RegionSummary = {
  id: string;
  slug: string;
  name: LocalizedText;
  coverImage: string | null;
  featured: boolean;
  sortOrder: number;
  listingCount: number;
  villageCount: number;
};

export type RegionWithVillages = RegionSummary & {
  villages: Village[];
};

export type PlaceType = 'a-frame' | 'villa-cottage' | 'hotel' | 'modular' | 'village-room';

export type GuestRange = 'lt5' | '5to10' | 'gt10';

export type Placement = 'forest' | 'water';

export type Meal = 'breakfast' | 'on-request';

export type Activity = 'quad' | 'horse' | 'fishing';

export type Listing = {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  region: Region;
  /** Localized region name; denormalized from the parent Region's JSON column. */
  regionName: LocalizedText;
  /** Optional FK to the listing's village. Null when no curated village fits. */
  villageId: string | null;
  /** Denormalized for display/filter convenience; null when villageId is null. */
  villageSlug: string | null;
  /** Localized village name; null when the listing has no village. */
  villageName: LocalizedText | null;
  placeType: PlaceType;
  price: number;
  images: string[];
  amenities: Amenity[];
  category: ListingCategory;
  rating: number;
  reviewCount: number;
  capacity: number;
  bedrooms: number;
  /** E.164-formatted phone number used by the "Call" CTA. */
  phone: string;
  meals: Meal[];
  activities: Activity[];
  location: ListingLocation;
  /** ISO-8601 date string. Used for "sort by newest". */
  createdAt: string;
};

export type HomeCategory =
  | 'all'
  | 'mountain'
  | 'forest'
  | 'river'
  | 'sea'
  | 'pool'
  | 'bbq'
  | 'winter'
  | 'cabin';

export type ListingsFilterState = {
  q: string;
  /**
   * Selected region slugs (multi). OR-combined with `village` at the service
   * layer: a listing matches if its region is in `region` OR its village is in
   * `village`. When both are empty, no location filter is applied.
   */
  region: string[];
  /** Selected village slugs (multi). */
  village: string[];
  type: PlaceType[];
  guests: GuestRange | null;
  placement: Placement[];
  food: Meal[];
  extra: Amenity[];
  basic: Amenity[];
  fun: Activity[];
};

export type FilterGroupName =
  | 'region'
  | 'village'
  | 'type'
  | 'guests'
  | 'placement'
  | 'food'
  | 'extra'
  | 'basic'
  | 'fun';

export type FilterCompatibility = Record<string, { count: number; compatible: boolean }>;

export type SortOption = 'price-asc' | 'price-desc' | 'rating' | 'newest';

export type ListingsView = 'grid' | 'list' | 'map';

export type { Locale };
