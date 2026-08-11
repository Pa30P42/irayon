'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

export type CreateBookingInput = {
  listingId: string;
  /** `YYYY-MM-DD`. */
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestNote?: string;
};

/**
 * Error codes the API returns as `error.message` for expected refusals, so the
 * UI can translate them instead of echoing server prose at the guest.
 */
export const BOOKING_ERROR_CODES = [
  'dates_unavailable',
  'duplicate_request',
  'own_listing',
  'invalid_state',
  'booking_expired',
] as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];

export const isBookingErrorCode = (value: string): value is BookingErrorCode =>
  (BOOKING_ERROR_CODES as readonly string[]).includes(value);

async function createBooking(input: CreateBookingInput): Promise<{ id: string }> {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string; fields?: Record<string, string[]> };
    } | null;
    const field = body?.error?.fields ? Object.values(body.error.fields)[0]?.[0] : undefined;
    throw new Error(body?.error?.message ?? field ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as { id: string };
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      // The new request doesn't hold dates, so availability is unchanged — but
      // the guest's own list now has an entry in it.
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}

async function cancelBooking(bookingId: string): Promise<void> {
  const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      // Cancelling an accepted booking releases nights back to the calendar.
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
