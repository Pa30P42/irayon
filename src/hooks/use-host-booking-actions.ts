'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Refusals the host inbox can explain in the host's own language, rather than
 * echoing a server string. `dates_unavailable` is the interesting one: it means
 * somebody else's accept won the race between this page loading and the click.
 */
export const HOST_BOOKING_ERROR_CODES = [
  'dates_unavailable',
  'invalid_state',
  'booking_expired',
] as const;

export type HostBookingErrorCode = (typeof HOST_BOOKING_ERROR_CODES)[number];

export const isHostBookingErrorCode = (value: string): value is HostBookingErrorCode =>
  (HOST_BOOKING_ERROR_CODES as readonly string[]).includes(value);

async function postAction(path: string, body?: unknown): Promise<void> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const parsed = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(parsed?.error?.message ?? `Request failed (${res.status})`);
  }
}

function useBookingMutation(build: (vars: { id: string; reason?: string }) => [string, unknown?]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reason?: string }) => {
      const [path, body] = build(vars);
      return postAction(path, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
      // Accepting or cancelling changes which nights are held.
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['host-blocks'] });
    },
  });
}

const enc = encodeURIComponent;

export const useAcceptBooking = () =>
  useBookingMutation(({ id }) => [`/api/host/bookings/${enc(id)}/accept`]);

export const useDeclineBooking = () =>
  useBookingMutation(({ id, reason }) => [
    `/api/host/bookings/${enc(id)}/decline`,
    reason ? { reason } : undefined,
  ]);

export const useHostCancelBooking = () =>
  useBookingMutation(({ id }) => [`/api/host/bookings/${enc(id)}/cancel`]);
