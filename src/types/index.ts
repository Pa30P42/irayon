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

/**
 * Amenity slugs are data-driven (admin CRUD at /admin/amenities). Plain
 * string so a new amenity doesn't require a code change; the DB is the
 * source of truth (see `AmenityOption`).
 */
export type Amenity = string;

/** Catalogue entry served by /api/amenities. */
export type AmenityOption = {
  id: string;
  slug: Amenity;
  icon: string | null;
  /** Group key: essentials | outdoor | kitchen | family | extras */
  category: string;
  name: LocalizedText;
};

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

/** Draft/publish/archive workflow. Only `published` listings are publicly visible. */
export type ListingStatus = 'draft' | 'published' | 'archived';

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
  status: ListingStatus;
  price: number;
  images: string[];
  amenities: Amenity[];
  /** One or more category tags. Always non-empty. */
  categories: ListingCategory[];
  rating: number;
  reviewCount: number;
  capacity: number;
  bedrooms: number;
  /** E.164-formatted phone number used by the "Call" CTA. Null hides the CTA. */
  phone: string | null;
  meals: Meal[];
  activities: Activity[];
  location: ListingLocation;
  /** ISO-8601 date string. Used for "sort by newest". */
  createdAt: string;
};

/**
 * Slim listing shape for list/card surfaces (catalogue grid, map, home,
 * admin list). Same as `Listing` minus the 3-locale `description`, with
 * `images` truncated to the cover and a real `imageCount` alongside.
 * A full `Listing` is NOT assignable here (it lacks `imageCount`) — use
 * `listingToCard` to project one.
 */
export type ListingCardDto = Omit<Listing, 'description'> & {
  /** Total image count (images itself carries only the cover URL). */
  imageCount: number;
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
  /** Category tags (OR-combined, matches the API's `hasSome`). */
  category: ListingCategory[];
  /** Price bounds in AZN/night; null = unbounded. URL keys match the API's. */
  price_min: number | null;
  price_max: number | null;
  /** Minimum guest capacity (the homepage hero's guests input). */
  capacity: number | null;
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
  | 'category'
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
