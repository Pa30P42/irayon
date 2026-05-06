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
  | 'fireplace'
  | 'kitchen'
  | 'bbq'
  | 'pets'
  | 'heating'
  | 'ac'
  | 'tv'
  | 'washer';

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
  | 'lerik';

export type Listing = {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  region: Region;
  price: number;
  images: string[];
  amenities: Amenity[];
  category: ListingCategory;
  rating: number;
  reviewCount: number;
  capacity: number;
  bedrooms: number;
  location: ListingLocation;
};

export type ListingFilters = {
  category?: ListingCategory;
  region?: Region;
  minPrice?: number;
  maxPrice?: number;
  capacity?: number;
  amenities?: Amenity[];
};

export type { Locale };
