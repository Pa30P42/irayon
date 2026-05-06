'use client';

import { differenceInCalendarDays } from 'date-fns';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

const CLEANING_FEE = 20;

type UseBookingCalculatorArgs = {
  pricePerNight: number;
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

export function useBookingCalculator({
  pricePerNight,
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
    const cleaningFee = CLEANING_FEE;
    const total = subtotal + cleaningFee;
    return { nights, pricePerNight, subtotal, cleaningFee, total, isValid: true };
  }, [pricePerNight, range]);
}
