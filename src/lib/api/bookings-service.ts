import { nightsBetween } from '@/lib/dates-baku';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { $Enums, type Prisma, type PrismaClient } from '@prisma/client';
import { mergeRanges, type DateRange } from './availability';
import {
  BOOKING_LIST_SELECT,
  HOST_BOOKING_LIST_SELECT,
  bookingToDto,
  type BookingDto,
} from './booking-dto';
import { isUsingMockData } from './listings-service';

/**
 * Booking reads, dual-pathed on `isUsingMockData()` like every other service
 * here. The mock path returns empty sets rather than fabricated bookings: an
 * invented booking would be a fabricated agreement between two people, and
 * every screen that renders one is better exercised by its genuine empty state.
 */

/**
 * Priced snapshot for a new request, derived on the SERVER from the listing
 * row. The client sends dates and a guest count; it never sends money.
 */
export type BookingPricing = {
  pricePerNight: number;
  cleaningFee: number;
  nights: number;
  total: number;
};

export function priceBooking(
  listing: { price: number; cleaningFee: number },
  checkIn: Date,
  checkOut: Date,
): BookingPricing {
  const nights = nightsBetween(checkIn, checkOut);
  return {
    pricePerNight: listing.price,
    cleaningFee: listing.cleaningFee,
    nights,
    total: nights * listing.price + listing.cleaningFee,
  };
}

/**
 * Dates a listing cannot be booked for: accepted bookings ∪ host blocks,
 * merged into the minimal set of ranges.
 *
 * PENDING requests are deliberately absent. Request-to-book means several
 * guests may ask for the same dates and the host chooses; greying them out
 * would hide availability that genuinely exists and hand the first requester a
 * lock they were never given.
 */
export async function getUnavailableRanges(
  listingId: string,
  window: DateRange,
  db: PrismaClient = defaultPrisma,
): Promise<DateRange[]> {
  if (isUsingMockData()) return [];

  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({
      where: {
        listingId,
        status: $Enums.BookingStatus.ACCEPTED,
        // Half-open overlap with the requested window, expressed in SQL.
        checkIn: { lt: window.end },
        checkOut: { gt: window.start },
      },
      select: { checkIn: true, checkOut: true },
    }),
    db.availabilityBlock.findMany({
      where: { listingId, startDate: { lt: window.end }, endDate: { gt: window.start } },
      select: { startDate: true, endDate: true },
    }),
  ]);

  return mergeRanges([
    ...bookings.map((b) => ({ start: b.checkIn, end: b.checkOut })),
    ...blocks.map((b) => ({ start: b.startDate, end: b.endDate })),
  ]);
}

/** Bookings a guest has made, newest first. */
export async function listGuestBookings(
  guestId: string,
  db: PrismaClient = defaultPrisma,
): Promise<BookingDto[]> {
  if (isUsingMockData()) return [];
  const rows = await db.booking.findMany({
    where: { guestId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: BOOKING_LIST_SELECT,
  });
  return rows.map(bookingToDto);
}

export type HostBookingFilter = 'pending' | 'upcoming' | 'past' | 'all';

/**
 * Bookings across every listing a host owns.
 *
 * The `pending` tab defensively excludes requests whose `expiresAt` has passed:
 * the cron sweep runs hourly, so for up to an hour a dead request would
 * otherwise sit in the inbox inviting the host to accept something the next
 * sweep is about to expire underneath them.
 */
export async function listHostBookings(
  hostId: string,
  filter: HostBookingFilter = 'all',
  db: PrismaClient = defaultPrisma,
  now: Date = new Date(),
): Promise<BookingDto[]> {
  if (isUsingMockData()) return [];

  const base: Prisma.BookingWhereInput = { listing: { hostId } };
  const where: Prisma.BookingWhereInput =
    filter === 'pending'
      ? { ...base, status: $Enums.BookingStatus.PENDING, expiresAt: { gt: now } }
      : filter === 'upcoming'
        ? { ...base, status: $Enums.BookingStatus.ACCEPTED, checkOut: { gte: now } }
        : filter === 'past'
          ? {
              ...base,
              OR: [
                { status: $Enums.BookingStatus.COMPLETED },
                { status: $Enums.BookingStatus.ACCEPTED, checkOut: { lt: now } },
              ],
            }
          : base;

  const rows = await db.booking.findMany({
    where,
    orderBy: filter === 'pending' ? { expiresAt: 'asc' } : { checkIn: 'desc' },
    take: 100,
    select: HOST_BOOKING_LIST_SELECT,
  });
  return rows.map(bookingToDto);
}

/** Counts for the host dashboard, in one query rather than four. */
export async function countHostBookingsByStatus(
  hostId: string,
  db: PrismaClient = defaultPrisma,
): Promise<Record<string, number>> {
  if (isUsingMockData()) return {};
  const rows = await db.booking.groupBy({
    by: ['status'],
    where: { listing: { hostId } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status.toLowerCase(), r._count._all]));
}

/** Unread in-app notifications, for the header badge. */
export async function countUnreadNotifications(
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<number> {
  if (isUsingMockData()) return 0;
  return db.notification.count({ where: { userId, readAt: null } });
}
