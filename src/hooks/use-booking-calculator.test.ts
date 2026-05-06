import { renderHook } from '@testing-library/react';
import type { DateRange } from 'react-day-picker';
import { describe, expect, it } from 'vitest';
import { useBookingCalculator } from './use-booking-calculator';

const mkRange = (fromIso: string, toIso: string): DateRange => ({
  from: new Date(fromIso),
  to: new Date(toIso),
});

describe('useBookingCalculator', () => {
  it('returns invalid breakdown when no range is selected', () => {
    const { result } = renderHook(() =>
      useBookingCalculator({ pricePerNight: 200, range: undefined }),
    );
    expect(result.current.isValid).toBe(false);
    expect(result.current.nights).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it('computes nights as the calendar-day difference', () => {
    const { result } = renderHook(() =>
      useBookingCalculator({
        pricePerNight: 200,
        range: mkRange('2025-06-01T00:00:00Z', '2025-06-04T00:00:00Z'),
      }),
    );
    expect(result.current.nights).toBe(3);
  });

  it('treats same-day from/to as 1 night (minimum)', () => {
    const { result } = renderHook(() =>
      useBookingCalculator({
        pricePerNight: 200,
        range: mkRange('2025-06-01T00:00:00Z', '2025-06-01T00:00:00Z'),
      }),
    );
    expect(result.current.nights).toBe(1);
    expect(result.current.subtotal).toBe(200);
  });

  it('totals subtotal + cleaning fee', () => {
    const { result } = renderHook(() =>
      useBookingCalculator({
        pricePerNight: 200,
        range: mkRange('2025-06-01T00:00:00Z', '2025-06-04T00:00:00Z'),
      }),
    );
    expect(result.current.subtotal).toBe(600);
    expect(result.current.cleaningFee).toBe(20);
    expect(result.current.total).toBe(620);
    expect(result.current.isValid).toBe(true);
  });

  it('returns invalid when only `from` is set', () => {
    const { result } = renderHook(() =>
      useBookingCalculator({
        pricePerNight: 200,
        range: { from: new Date('2025-06-01T00:00:00Z') },
      }),
    );
    expect(result.current.isValid).toBe(false);
  });
});
