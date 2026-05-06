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

export type Region =
  | 'gabala'
  | 'sheki'
  | 'guba'
  | 'lankaran'
  | 'gusar'
  | 'gakh'
  | 'ismayilli'
  | 'goychay'
  | 'absheron'
  | 'lerik'
  | 'zagatala';

export type Direction = 'ismayilli' | 'guba' | 'lerik' | 'zagatala' | 'others';

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
  direction: Direction;
  placeType: PlaceType;
  price: number;
  images: string[];
  amenities: Amenity[];
  category: ListingCategory;
  rating: number;
  reviewCount: number;
  capacity: number;
  bedrooms: number;
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
  direction: Direction[];
  type: PlaceType[];
  guests: GuestRange | null;
  placement: Placement[];
  food: Meal[];
  extra: Amenity[];
  basic: Amenity[];
  fun: Activity[];
};

export type FilterGroupName =
  | 'direction'
  | 'type'
  | 'guests'
  | 'placement'
  | 'food'
  | 'extra'
  | 'basic'
  | 'fun';

export type FilterCompatibility = Record<string, { count: number; compatible: boolean }>;

export type SortOption = 'price-asc' | 'price-desc' | 'rating' | 'newest';

export type ListingsView = 'grid' | 'list';

export type { Locale };
