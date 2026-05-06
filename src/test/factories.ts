import { emptyFilterState } from '@/lib/constants';
import type { Listing, ListingsFilterState } from '@/types';

export const makeListing = (overrides: Partial<Listing> & Pick<Listing, 'id'>): Listing => ({
  slug: overrides.id,
  title: { az: 't', ru: 't', en: 't' },
  description: { az: 'd', ru: 'd', en: 'd' },
  region: 'gabala',
  direction: 'others',
  placeType: 'villa-cottage',
  price: 200,
  images: [],
  amenities: [],
  category: 'mountain',
  rating: 4,
  reviewCount: 10,
  capacity: 4,
  bedrooms: 2,
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
