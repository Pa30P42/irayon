import { listingToCard } from '@/lib/api/listing-dto';
import { emptyFilterState } from '@/lib/constants';
import type { Listing, ListingCardDto, ListingsFilterState } from '@/types';

export const makeListing = (overrides: Partial<Listing> & Pick<Listing, 'id'>): Listing => ({
  slug: overrides.id,
  title: { az: 't', ru: 't', en: 't' },
  description: { az: 'd', ru: 'd', en: 'd' },
  region: 'gabala',
  regionName: { az: 'Qəbələ', ru: 'Габала', en: 'Gabala' },
  villageId: null,
  villageSlug: null,
  villageName: null,
  placeType: 'villa-cottage',
  price: 200,
  cleaningFee: 0,
  images: [],
  amenities: [],
  categories: ['mountain'],
  rating: 4,
  reviewCount: 10,
  capacity: 4,
  bedrooms: 2,
  status: 'published',
  phone: '+994500000000',
  meals: [],
  activities: [],
  location: { lat: 0, lng: 0, address: '' },
  createdAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

export const makeFilterState = (
  overrides: Partial<ListingsFilterState> = {},
): ListingsFilterState => ({
  ...emptyFilterState(),
  ...overrides,
});

/** Card-shaped fixture: same overrides API as `makeListing`, projected. */
export const makeListingCard = (
  overrides: Partial<Listing> & Pick<Listing, 'id'>,
): ListingCardDto => listingToCard(makeListing(overrides));
