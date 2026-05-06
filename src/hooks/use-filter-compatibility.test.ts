import { makeFilterState, makeListing } from '@/test/factories';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFilterCompatibility } from './use-filter-compatibility';

const listings = [
  makeListing({ id: '1', amenities: ['pool', 'sauna'] }),
  makeListing({ id: '2', amenities: ['pool', 'fireplace'] }),
  makeListing({ id: '3', amenities: ['fireplace'] }),
];

describe('useFilterCompatibility', () => {
  it('returns counts and compatibility flags for each option', () => {
    const { result } = renderHook(() =>
      useFilterCompatibility({
        listings,
        state: makeFilterState(),
        group: 'extra',
        options: ['pool', 'sauna', 'fireplace'],
      }),
    );

    expect(result.current['pool']).toEqual({ count: 2, compatible: true });
    expect(result.current['sauna']).toEqual({ count: 1, compatible: true });
    expect(result.current['fireplace']).toEqual({ count: 2, compatible: true });
  });

  it('marks combinations that yield zero as incompatible', () => {
    // Selecting "sauna" leaves only listing 1; combining with "fireplace" yields 0.
    const { result } = renderHook(() =>
      useFilterCompatibility({
        listings,
        state: makeFilterState({ extra: ['sauna'] }),
        group: 'extra',
        options: ['pool', 'fireplace'],
      }),
    );

    expect(result.current['pool']?.compatible).toBe(true);
    expect(result.current['fireplace']?.compatible).toBe(false);
    expect(result.current['fireplace']?.count).toBe(0);
  });

  it('clearing filters resets all compatibility (counts come back)', () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useFilterCompatibility({
          listings,
          state,
          group: 'extra',
          options: ['pool', 'sauna', 'fireplace'],
        }),
      { initialProps: { state: makeFilterState({ extra: ['sauna'] }) } },
    );

    expect(result.current['fireplace']?.compatible).toBe(false);

    rerender({ state: makeFilterState() });

    expect(result.current['fireplace']?.compatible).toBe(true);
    expect(result.current['fireplace']?.count).toBe(2);
  });
});
