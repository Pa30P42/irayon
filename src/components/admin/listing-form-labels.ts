import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import type { Listing, ListingCategory, PlaceType } from '@/types';

/**
 * Form defaults and helpers for the listing form. Display labels for place
 * types, categories, amenities, meals, and activities are pulled from the
 * `admin.labels.*` i18n namespace inside each form section component.
 */

export type LocaleTab = 'en' | 'ru' | 'az';

export const DEFAULT_VALUES: CreateListingInput = {
  title: { az: '', ru: '', en: '' },
  description: { az: '', ru: '', en: '' },
  region: 'gabala',
  villageId: null,
  placeType: 'villa-cottage' as PlaceType,
  categories: ['mountain'] as ListingCategory[],
  price: 200,
  capacity: 4,
  bedrooms: 2,
  lat: 40.4093,
  lng: 49.8671,
  address: '',
  phone: '+994',
  amenities: [],
  meals: [],
  activities: [],
};

/**
 * Project a `Listing` DTO into a `CreateListingInput` shape so the edit form
 * can seed itself from the public listing payload. Shared between the new
 * and edit clients so the mapping lives in one place.
 */
export const listingToFormValues = (listing: Listing): Partial<CreateListingInput> => ({
  title: listing.title,
  description: listing.description,
  region: listing.region,
  villageId: listing.villageId,
  placeType: listing.placeType,
  categories: listing.categories,
  price: listing.price,
  capacity: listing.capacity,
  bedrooms: listing.bedrooms,
  lat: listing.location.lat,
  lng: listing.location.lng,
  address: listing.location.address,
  phone: listing.phone || '+994',
  amenities: listing.amenities,
  meals: listing.meals,
  activities: listing.activities,
});
