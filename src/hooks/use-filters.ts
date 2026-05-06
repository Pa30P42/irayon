'use client';

import type { Amenity, ListingCategory, ListingFilters, Region } from '@/types';
import { parseAsArrayOf, parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useMemo } from 'react';

const parsers = {
  category: parseAsString,
  region: parseAsString,
  minPrice: parseAsInteger,
  maxPrice: parseAsInteger,
  capacity: parseAsInteger,
  amenities: parseAsArrayOf(parseAsString).withDefault([]),
};

export function useFilters() {
  const [raw, setRaw] = useQueryStates(parsers, { history: 'push' });

  const filters = useMemo<ListingFilters>(
    () => ({
      category: (raw.category as ListingCategory | null) ?? undefined,
      region: (raw.region as Region | null) ?? undefined,
      minPrice: raw.minPrice ?? undefined,
      maxPrice: raw.maxPrice ?? undefined,
      capacity: raw.capacity ?? undefined,
      amenities: (raw.amenities as Amenity[]).length > 0 ? (raw.amenities as Amenity[]) : undefined,
    }),
    [raw],
  );

  const reset = () =>
    setRaw({
      category: null,
      region: null,
      minPrice: null,
      maxPrice: null,
      capacity: null,
      amenities: [],
    });

  return { filters, setFilters: setRaw, reset };
}
