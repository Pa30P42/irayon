import { makeFilterState, makeListing } from '@/test/factories';
import { describe, expect, it } from 'vitest';
import {
  applyListingsFilter,
  computeCompatibility,
  countActiveFilters,
  isOptionSelected,
  sortListings,
  toggleOption,
  withOption,
} from './listings-filter';

const listings = [
  makeListing({
    id: '1',
    villageSlug: 'qirmizi-qasaba',
    placeType: 'villa-cottage',
    capacity: 8,
    category: 'mountain',
    amenities: ['pool', 'bbq', 'wifi'],
    meals: ['breakfast'],
    activities: ['horse'],
    price: 400,
    rating: 4.9,
  }),
  makeListing({
    id: '2',
    villageSlug: 'hamarat',
    placeType: 'a-frame',
    capacity: 3,
    category: 'forest',
    amenities: ['fireplace', 'kitchen'],
    meals: [],
    activities: ['fishing'],
    price: 150,
    rating: 4.6,
  }),
  makeListing({
    id: '3',
    villageSlug: 'lahij',
    placeType: 'villa-cottage',
    capacity: 12,
    category: 'sea',
    amenities: ['pool', 'jacuzzi', 'ev-charger'],
    meals: ['breakfast', 'on-request'],
    activities: [],
    price: 620,
    rating: 4.8,
  }),
  makeListing({
    id: '4',
    villageSlug: 'mamrux',
    placeType: 'village-room',
    capacity: 5,
    category: 'river',
    amenities: ['kitchen', 'crib'],
    meals: [],
    activities: ['fishing', 'horse'],
    price: 220,
    rating: 4.7,
  }),
];

describe('applyListingsFilter', () => {
  it('returns all when no filters', () => {
    expect(applyListingsFilter(listings, makeFilterState())).toHaveLength(4);
  });

  it('filters by village (OR within group)', () => {
    const out = applyListingsFilter(
      listings,
      makeFilterState({ village: ['qirmizi-qasaba', 'hamarat'] }),
    );
    expect(out.map((l) => l.id)).toEqual(['1', '2']);
  });

  it('excludes listings without a village when village filter is active', () => {
    const noVillage = makeListing({ id: '5', villageSlug: null });
    expect(
      applyListingsFilter(
        [...listings, noVillage],
        makeFilterState({ village: ['qirmizi-qasaba'] }),
      ).map((l) => l.id),
    ).toEqual(['1']);
  });

  it('filters by guests range', () => {
    expect(
      applyListingsFilter(listings, makeFilterState({ guests: 'lt5' })).map((l) => l.id),
    ).toEqual(['2']);
    expect(
      applyListingsFilter(listings, makeFilterState({ guests: '5to10' })).map((l) => l.id),
    ).toEqual(['1', '4']);
    expect(
      applyListingsFilter(listings, makeFilterState({ guests: 'gt10' })).map((l) => l.id),
    ).toEqual(['3']);
  });

  it('filters by placement (water includes river/sea/lake)', () => {
    expect(
      applyListingsFilter(listings, makeFilterState({ placement: ['water'] })).map((l) => l.id),
    ).toEqual(['3', '4']);
    expect(
      applyListingsFilter(listings, makeFilterState({ placement: ['forest'] })).map((l) => l.id),
    ).toEqual(['1', '2']);
  });

  it('filters by extra (AND within group)', () => {
    expect(
      applyListingsFilter(listings, makeFilterState({ extra: ['pool', 'jacuzzi'] })).map(
        (l) => l.id,
      ),
    ).toEqual(['3']);
  });

  it('filters by activities (AND within group)', () => {
    expect(
      applyListingsFilter(listings, makeFilterState({ fun: ['fishing', 'horse'] })).map(
        (l) => l.id,
      ),
    ).toEqual(['4']);
  });

  it('combines filters across groups (AND)', () => {
    const out = applyListingsFilter(
      listings,
      makeFilterState({ village: ['qirmizi-qasaba', 'lahij'], extra: ['pool'] }),
    );
    expect(out.map((l) => l.id)).toEqual(['1', '3']);
  });

  it('searches across title/region/address/villageSlug', () => {
    expect(
      applyListingsFilter(listings, makeFilterState({ q: 'qirmizi' })).map((l) => l.id),
    ).toEqual(['1']);
  });
});

describe('toggleOption / withOption / isOptionSelected', () => {
  it('toggles a multiselect group', () => {
    const s1 = makeFilterState();
    const s2 = toggleOption(s1, 'extra', 'pool');
    expect(isOptionSelected(s2, 'extra', 'pool')).toBe(true);
    const s3 = toggleOption(s2, 'extra', 'pool');
    expect(isOptionSelected(s3, 'extra', 'pool')).toBe(false);
  });

  it('toggles guests as a single select (off if same)', () => {
    const s1 = toggleOption(makeFilterState(), 'guests', 'lt5');
    expect(s1.guests).toBe('lt5');
    const s2 = toggleOption(s1, 'guests', 'lt5');
    expect(s2.guests).toBeNull();
  });

  it('withOption is idempotent for an already-included option', () => {
    const s1 = withOption(makeFilterState({ extra: ['pool'] }), 'extra', 'pool');
    expect(s1.extra).toEqual(['pool']);
  });
});

describe('computeCompatibility', () => {
  it('counts results assuming each village were selected', () => {
    const compat = computeCompatibility(listings, makeFilterState(), 'village', [
      'qirmizi-qasaba',
      'hamarat',
      'mamrux',
      'lahij',
      'unknown-slug',
    ]);
    expect(compat['qirmizi-qasaba']).toEqual({ count: 1, compatible: true });
    expect(compat['hamarat']).toEqual({ count: 1, compatible: true });
    expect(compat['mamrux']).toEqual({ count: 1, compatible: true });
    expect(compat['lahij']).toEqual({ count: 1, compatible: true });
    expect(compat['unknown-slug']).toEqual({ count: 0, compatible: false });
  });

  it('marks options as incompatible when adding them yields zero', () => {
    // After selecting 'jacuzzi', only listing 3 remains; pool stays compatible.
    const state = makeFilterState({ extra: ['jacuzzi'] });
    const compat = computeCompatibility(listings, state, 'extra', ['pool', 'fireplace', 'bbq']);
    expect(compat['pool']?.compatible).toBe(true);
    expect(compat['fireplace']?.compatible).toBe(false);
    expect(compat['bbq']?.compatible).toBe(false);
  });
});

describe('sortListings', () => {
  it('sorts by price ascending and descending', () => {
    expect(sortListings(listings, 'price-asc').map((l) => l.id)).toEqual(['2', '4', '1', '3']);
    expect(sortListings(listings, 'price-desc').map((l) => l.id)).toEqual(['3', '1', '4', '2']);
  });

  it('sorts by rating descending', () => {
    expect(sortListings(listings, 'rating').map((l) => l.id)).toEqual(['1', '3', '4', '2']);
  });

  it('sorts by newest using createdAt', () => {
    const fixtures = [
      makeListing({ id: 'old', createdAt: '2024-01-01T00:00:00.000Z' }),
      makeListing({ id: 'mid', createdAt: '2024-06-01T00:00:00.000Z' }),
      makeListing({ id: 'new', createdAt: '2025-03-01T00:00:00.000Z' }),
    ];
    expect(sortListings(fixtures, 'newest').map((l) => l.id)).toEqual(['new', 'mid', 'old']);
  });
});

describe('countActiveFilters', () => {
  it('counts each selected option (and guests as one)', () => {
    expect(
      countActiveFilters(
        makeFilterState({
          village: ['qirmizi-qasaba', 'hamarat'],
          extra: ['pool'],
          guests: 'lt5',
        }),
      ),
    ).toBe(4);
  });
});
