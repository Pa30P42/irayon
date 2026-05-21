import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import type { Activity, Amenity, ListingCategory, Meal, PlaceType } from '@/types';

/**
 * Display labels and form defaults for the listing form. Pulled out so the
 * form component itself only renders — change a label without scrolling
 * through 600 lines of JSX.
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

export const PLACE_TYPE_LABEL: Record<PlaceType, string> = {
  'a-frame': 'A-frame',
  'villa-cottage': 'Villa / cottage',
  hotel: 'Hotel',
  modular: 'Modular home',
  'village-room': 'Village room',
};

export const CATEGORY_LABEL: Record<ListingCategory, string> = {
  mountain: 'Mountain',
  forest: 'Forest',
  river: 'River',
  sea: 'Sea',
  lake: 'Lake',
};

export const AMENITY_LABEL: Record<Amenity, string> = {
  wifi: 'Wi-Fi',
  parking: 'Parking',
  pool: 'Pool',
  sauna: 'Sauna',
  jacuzzi: 'Jacuzzi',
  fireplace: 'Fireplace',
  kitchen: 'Kitchen',
  bbq: 'BBQ',
  pets: 'Pets allowed',
  heating: 'Heating',
  ac: 'Air conditioning',
  tv: 'TV',
  washer: 'Washing machine',
  iron: 'Iron',
  hairdryer: 'Hairdryer',
  crib: 'Baby crib',
  kids: "Kids' entertainment",
  'ev-charger': 'EV charger',
};

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'Breakfast included',
  'on-request': 'Meals on request',
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  quad: 'Quad bike',
  horse: 'Horseback riding',
  fishing: 'Fishing',
};
