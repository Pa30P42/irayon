import { apiConflict, apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import type { BookingActionResult, LoadedBooking } from '@/lib/api/booking-actions';
import { bookingToDto } from '@/lib/api/booking-dto';
import { parseLocalized } from '@/lib/api/localized-text';
import { SITE } from '@/lib/constants';
import type { BookingEmailKind } from '@/lib/email/email-strings';
import { sendEmail } from '@/lib/email/send-email';

/**
 * Maps a `BookingActionResult` failure onto an HTTP response.
 *
 * Shared so the four transition routes answer identically — a host who is told
 * "those dates are taken" by one endpoint and "conflict" by another has no way
 * to build a mental model of the system.
 */
export function bookingFailureResponse(
  result: Exclude<BookingActionResult, { kind: 'ok' }>,
): Response {
  switch (result.kind) {
    case 'not-found':
      // Ownership failures land here too: 404, never 403, so the endpoint can't
      // be used to confirm that a booking id exists.
      return apiNotFound('Not found');
    case 'invalid-state':
      return apiConflict('invalid_state', {
        status: [`This booking is ${result.status.toLowerCase()}`],
      });
    case 'expired':
      return apiConflict('booking_expired');
    case 'dates-unavailable':
      return apiConflict('dates_unavailable');
    default:
      return apiServerError();
  }
}

export const bookingOk = (booking: LoadedBooking) => apiOk(bookingToDto(booking));

/**
 * Notification email for a booking transition.
 *
 * Reads the SNAPSHOT columns exclusively — `total` and `currency` come from the
 * booking, never from the listing's current pricing. See `booking-dto.ts` for
 * why that distinction matters at settlement time.
 */
export async function sendBookingEmail(
  booking: LoadedBooking,
  kind: BookingEmailKind,
  recipient: 'guest' | 'host',
  reason?: string | null,
): Promise<void> {
  const to = recipient === 'guest' ? booking.guest.email : booking.listing.host?.email;
  if (!to) return;

  const locale =
    recipient === 'guest'
      ? booking.guest.preferredLocale
      : (booking.listing.host?.preferredLocale ?? 'az');
  const name = recipient === 'guest' ? booking.guest.name : (booking.listing.host?.name ?? null);
  const path = recipient === 'guest' ? 'account/bookings' : 'host/bookings';

  await sendEmail({
    to,
    locale,
    template: 'booking-update',
    data: {
      kind,
      listingTitle: parseLocalized(booking.listing.title).en,
      checkIn: booking.checkIn.toISOString().slice(0, 10),
      checkOut: booking.checkOut.toISOString().slice(0, 10),
      guestCount: booking.guestCount,
      total: booking.total,
      currency: booking.currency,
      reason: reason ?? null,
      actionUrl: `${SITE.url}/${locale}/${path}`,
      recipientName: name,
    },
  });
}
