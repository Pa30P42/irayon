'use client';

import { findListingBySlug } from '@/data/mock-listings';
import type { Listing } from '@/types';
import { useMemo } from 'react';

/**
 * Resolves a listing by slug from the in-memory mock catalogue.
 * Server callers can import `findListingBySlug` directly — this hook exists
 * for the few client-only contexts (e.g. tests, embedded interactive panels).
 */
export function useListing(slug: string): Listing | undefined {
  return useMemo(() => findListingBySlug(slug), [slug]);
}
