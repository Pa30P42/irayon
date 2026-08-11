'use client';

import { differenceInCalendarDays } from 'date-fns';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

type UseBookingCalculatorArgs = {
  pricePerNight: number;
  /**
   * Per-stay cleaning fee, from the listing.
   *
   * This used to be a hardcoded platform-wide `CLEANING_FEE = 20`, which was
   * defensible while one operator owned every listing and indefensible the
   * moment hosts did: a host who doesn't charge cleaning had one invented for
   * them, and a host who charges more silently under-quoted every guest.
   */
  cleaningFee: number;
  range: DateRange | undefined;
};

export type BookingBreakdown = {
  nights: number;
  pricePerNight: number;
  subtotal: number;
  cleaningFee: number;
  total: number;
  isValid: boolean;
};

/**
 * Client-side price preview.
 *
 * **Advisory only.** The server re-derives the whole breakdown from the
 * database when a request is created, and the resulting snapshot is what both
 * parties are shown from then on. Nothing here is ever trusted as an input.
 */
export function useBookingCalculator({
  pricePerNight,
  cleaningFee,
  range,
}: UseBookingCalculatorArgs): BookingBreakdown {
  return useMemo(() => {
    if (!range?.from || !range?.to) {
      return {
        nights: 0,
        pricePerNight,
        subtotal: 0,
        cleaningFee: 0,
        total: 0,
        isValid: false,
      };
    }
    const nights = Math.max(1, differenceInCalendarDays(range.to, range.from));
    const subtotal = nights * pricePerNight;
    const total = subtotal + cleaningFee;
    return { nights, pricePerNight, subtotal, cleaningFee, total, isValid: true };
  }, [pricePerNight, cleaningFee, range]);
}
