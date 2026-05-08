import type { Listing } from '@/types';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFilteredListings } from './use-filtered-listings';

const make = (overrides: Partial<Listing> & Pick<Listing, 'id'>): Listing => ({
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

const fixtures: Listing[] = [
  make({ id: '1', category: 'mountain', amenities: ['pool', 'wifi'], bedrooms: 4 }),
  make({ id: '2', category: 'forest', amenities: ['fireplace', 'heating'], bedrooms: 2 }),
  make({ id: '3', category: 'sea', amenities: ['pool', 'bbq'], bedrooms: 5 }),
  make({ id: '4', category: 'river', amenities: ['kitchen'], bedrooms: 1 }),
  make({ id: '5', category: 'mountain', amenities: ['fireplace'], bedrooms: 3 }),
];

describe('useFilteredListings', () => {
  it('returns all when category is "all"', () => {
    const { result } = renderHook(() =>
      useFilteredListings({ listings: fixtures, category: 'all' }),
    );
    expect(result.current.listings).toHaveLength(5);
    expect(result.current.total).toBe(5);
  });

  it('filters by listing category', () => {
    const { result } = renderHook(() =>
      useFilteredListings({ listings: fixtures, category: 'mountain' }),
    );
    expect(result.current.listings.map((l) => l.id)).toEqual(['1', '5']);
  });

  it('filters "pool" by amenity', () => {
    const { result } = renderHook(() =>
      useFilteredListings({ listings: fixtures, category: 'pool' }),
    );
    expect(result.current.listings.map((l) => l.id)).toEqual(['1', '3']);
  });

  it('filters "winter" by fireplace + heating', () => {
    const { result } = renderHook(() =>
      useFilteredListings({ listings: fixtures, category: 'winter' }),
    );
    expect(result.current.listings.map((l) => l.id)).toEqual(['2']);
  });

  it('filters "cabin" by bedrooms <= 2', () => {
    const { result } = renderHook(() =>
      useFilteredListings({ listings: fixtures, category: 'cabin' }),
    );
    expect(result.current.listings.map((l) => l.id)).toEqual(['2', '4']);
  });

  it('respects the limit', () => {
    const { result } = renderHook(() =>
      useFilteredListings({ listings: fixtures, category: 'all', limit: 2 }),
    );
    expect(result.current.listings).toHaveLength(2);
    expect(result.current.total).toBe(5);
  });
});
