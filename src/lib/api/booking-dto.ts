import type { $Enums, Prisma } from '@prisma/client';
import { parseLocalized } from './localized-text';

/**
 * Read shapes for bookings.
 *
 * **The single most important thing in this file is what the select does NOT
 * contain: `listing.price` and `listing.cleaningFee`.**
 *
 * Those are live-apply fields — a host can change them at any moment. If the
 * host inbox, the accept confirmation, or a booking email rendered current
 * pricing, then a host who raised their price between a guest's request and
 * their own acceptance would confirm a booking believing it was worth more than
 * the guest was ever quoted. With offline settlement that is a dispute at the
 * front door with no system record of what either party thought they agreed to.
 *
 * Every booking surface therefore reads exclusively from the snapshot columns
 * on the Booking row. Leaving the live fields out of the select entirely makes
 * that structural rather than a rule to remember: a developer who reaches for
 * `booking.listing.price` gets a typecheck error, not a subtle bug.
 */

const BOOKING_SCALARS = {
  id: true,
  status: true,
  checkIn: true,
  checkOut: true,
  guestCount: true,
  guestNote: true,
  // The price snapshot, as agreed at request time.
  pricePerNight: true,
  cleaningFee: true,
  nights: true,
  total: true,
  currency: true,
  expiresAt: true,
  acceptedAt: true,
  declinedAt: true,
  declineReason: true,
  cancelledAt: true,
  cancelledBy: true,
  createdAt: true,
} as const satisfies Prisma.BookingSelect;

/**
 * Listing fields a booking may show. Identity and a photo — never money.
 * `cleaningFee` and `price` are conspicuously absent; see the note above.
 */
const BOOKING_LISTING_SELECT = {
  select: {
    id: true,
    slug: true,
    title: true,
    images: { select: { url: true }, orderBy: { order: 'asc' }, take: 1 },
  },
} as const;

export const BOOKING_LIST_SELECT = {
  ...BOOKING_SCALARS,
  listing: BOOKING_LISTING_SELECT,
} as const satisfies Prisma.BookingSelect;

/** Host-facing: adds the guest's identity, which the guest's own view doesn't need. */
export const HOST_BOOKING_LIST_SELECT = {
  ...BOOKING_SCALARS,
  listing: BOOKING_LISTING_SELECT,
  guest: { select: { id: true, name: true, email: true, phone: true, image: true } },
} as const satisfies Prisma.BookingSelect;

export type BookingRow = Prisma.BookingGetPayload<{ select: typeof BOOKING_LIST_SELECT }>;
export type HostBookingRow = Prisma.BookingGetPayload<{
  select: typeof HOST_BOOKING_LIST_SELECT;
}>;

const STATUS_TO_DTO: Record<$Enums.BookingStatus, string> = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

export type BookingDto = {
  id: string;
  status: string;
  /** `YYYY-MM-DD` — a calendar date, never a timestamp. */
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestNote: string | null;
  /** Priced as agreed at request time. Never recomputed. */
  pricing: {
    pricePerNight: number;
    cleaningFee: number;
    nights: number;
    total: number;
    currency: string;
  };
  expiresAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  listing: {
    id: string;
    slug: string;
    title: { az: string; ru: string; en: string };
    image: string | null;
  };
  guest?: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    image: string | null;
  };
};

/** `Date` → `YYYY-MM-DD`. The value is UTC midnight, so this is exact. */
const toCalendarString = (date: Date): string => date.toISOString().slice(0, 10);

export function bookingToDto(row: BookingRow | HostBookingRow): BookingDto {
  const dto: BookingDto = {
    id: row.id,
    status: STATUS_TO_DTO[row.status],
    checkIn: toCalendarString(row.checkIn),
    checkOut: toCalendarString(row.checkOut),
    guestCount: row.guestCount,
    guestNote: row.guestNote,
    pricing: {
      pricePerNight: row.pricePerNight,
      cleaningFee: row.cleaningFee,
      nights: row.nights,
      total: row.total,
      currency: row.currency,
    },
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    declinedAt: row.declinedAt?.toISOString() ?? null,
    declineReason: row.declineReason,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelledBy: row.cancelledBy,
    createdAt: row.createdAt.toISOString(),
    listing: {
      id: row.listing.id,
      slug: row.listing.slug,
      title: parseLocalized(row.listing.title),
      image: row.listing.images[0]?.url ?? null,
    },
  };

  if ('guest' in row && row.guest) {
    dto.guest = {
      id: row.guest.id,
      name: row.guest.name,
      email: row.guest.email,
      phone: row.guest.phone,
      image: row.guest.image,
    };
  }

  return dto;
}
