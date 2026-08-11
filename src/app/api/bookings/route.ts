import {
  apiBadRequest,
  apiBadRequestRaw,
  apiConflict,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { overlapsAny } from '@/lib/api/availability';
import { BOOKING_LIST_SELECT, bookingToDto } from '@/lib/api/booking-dto';
import { createBookingSchema } from '@/lib/api/booking-validator';
import { getUnavailableRanges, listGuestBookings, priceBooking } from '@/lib/api/bookings-service';
import { publicListingWhere } from '@/lib/api/listings-service';
import { parseLocalized } from '@/lib/api/localized-text';
import { notificationData } from '@/lib/api/notifications';
import { requireSameOrigin, requireUser } from '@/lib/auth-helpers';
import { SITE } from '@/lib/constants';
import { bookingExpiresAt } from '@/lib/dates-baku';
import { sendEmail } from '@/lib/email/send-email';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { $Enums } from '@prisma/client';
import { after } from 'next/server';

/** GET /api/bookings — the signed-in guest's own requests. */
export async function GET(): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    return apiOk({ data: await listGuestBookings(auth.user.id) });
  } catch (err) {
    logger.error('GET /api/bookings failed', { err });
    return apiServerError();
  }
}

/**
 * POST /api/bookings — request to book.
 *
 * Creating a request does NOT hold the dates. Several guests may ask for the
 * same nights and the host chooses; only an acceptance takes them, which is
 * what the exclusion constraint's `WHERE status = 'accepted'` encodes.
 */
export async function POST(request: Request): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireUser({ force: true });
  if (!auth.ok) return auth.response;

  const rate = await checkRateLimit('bookingCreate', auth.user.id);
  if (!rate.success) {
    return new Response(JSON.stringify({ error: { message: 'Too many booking requests' } }), {
      status: 429,
      headers: { 'content-type': 'application/json', ...rateLimitHeaders(rate) },
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }

  const parsed = createBookingSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const input = parsed.data;

  try {
    // Only a publicly visible listing can be booked. This also stops a guest
    // discovering unapproved listings by id.
    const listing = await prisma.listing.findFirst({
      where: { id: input.listingId, ...publicListingWhere },
      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        cleaningFee: true,
        capacity: true,
        hostId: true,
        host: { select: { id: true, email: true, name: true, preferredLocale: true } },
      },
    });
    if (!listing) return apiNotFound('Listing not found');

    // A host booking their own place is meaningless and would let them block
    // their own calendar through the guest flow, bypassing availability blocks.
    if (listing.hostId === auth.user.id) {
      return apiConflict('You cannot book your own listing');
    }

    if (input.guestCount > listing.capacity) {
      return apiBadRequestRaw(`This place sleeps at most ${listing.capacity} guests`);
    }

    const requested = { start: input.checkIn, end: input.checkOut };

    // NON-AUTHORITATIVE pre-check: fail fast with a useful message rather than
    // making the guest wait for a host to accept something already taken. The
    // real guarantee is the exclusion constraint at accept time.
    const unavailable = await getUnavailableRanges(listing.id, requested);
    if (overlapsAny(requested, unavailable)) {
      return apiConflict('dates_unavailable');
    }

    // One live request per guest per overlapping range. Without this a guest
    // can spam a host's inbox with ten variations of the same stay.
    const existing = await prisma.booking.findFirst({
      where: {
        listingId: listing.id,
        guestId: auth.user.id,
        status: $Enums.BookingStatus.PENDING,
        expiresAt: { gt: new Date() },
        checkIn: { lt: input.checkOut },
        checkOut: { gt: input.checkIn },
      },
      select: { id: true },
    });
    if (existing) return apiConflict('duplicate_request');

    // Priced on the SERVER from the listing row. The client never sends money.
    const pricing = priceBooking(listing, input.checkIn, input.checkOut);

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          listingId: listing.id,
          guestId: auth.user.id,
          status: $Enums.BookingStatus.PENDING,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          guestCount: input.guestCount,
          guestNote: input.guestNote ?? null,
          ...pricing,
          expiresAt: bookingExpiresAt(input.checkIn),
        },
        select: BOOKING_LIST_SELECT,
      });

      // In the SAME transaction: the host cannot fail to be told about a
      // request that exists.
      await tx.notification.create({
        data: notificationData(listing.hostId, 'booking.requested', {
          bookingId: created.id,
          listingId: listing.id,
          listingSlug: listing.slug,
          checkIn: input.checkIn.toISOString().slice(0, 10),
          checkOut: input.checkOut.toISOString().slice(0, 10),
          by: 'guest',
        }),
      });

      return created;
    });

    after(async () => {
      if (!listing.host?.email) return;
      await sendEmail({
        to: listing.host.email,
        locale: listing.host.preferredLocale,
        template: 'booking-update',
        data: {
          kind: 'requested',
          listingTitle: parseLocalized(booking.listing.title).en,
          checkIn: booking.checkIn.toISOString().slice(0, 10),
          checkOut: booking.checkOut.toISOString().slice(0, 10),
          guestCount: booking.guestCount,
          total: booking.total,
          currency: booking.currency,
          actionUrl: `${SITE.url}/${listing.host.preferredLocale}/host/bookings`,
          recipientName: listing.host.name,
        },
      });
    });

    return apiOk(bookingToDto(booking), { status: 201 });
  } catch (err) {
    logger.error('POST /api/bookings failed', { err });
    return apiServerError('Could not create the booking request');
  }
}
