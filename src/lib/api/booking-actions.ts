import { prisma as defaultPrisma } from '@/lib/prisma';
import { $Enums, Prisma, type PrismaClient } from '@prisma/client';
import { overlapsAny, rangesOverlap, type DateRange } from './availability';
import { HOST_BOOKING_LIST_SELECT } from './booking-dto';
import { canTransition, type BookingActor } from './booking-state';
import { notificationData, type NotificationType } from './notifications';

/**
 * Booking state changes.
 *
 * Every one of these writes its notification INSIDE the same transaction as the
 * status change. That is the property that makes email optional: the user can
 * always find out what happened by opening the app, whether or not a message
 * ever left the building.
 */

const ACTION_SELECT = {
  ...HOST_BOOKING_LIST_SELECT,
  listing: {
    select: {
      id: true,
      slug: true,
      title: true,
      hostId: true,
      host: { select: { email: true, name: true, preferredLocale: true } },
      // NOTE: no `price` / `cleaningFee`. Bookings render from their snapshot.
      images: { select: { url: true }, orderBy: { order: 'asc' as const }, take: 1 },
    },
  },
  guest: {
    select: { id: true, name: true, email: true, phone: true, image: true, preferredLocale: true },
  },
} as const;

export type LoadedBooking = Prisma.BookingGetPayload<{ select: typeof ACTION_SELECT }>;

/**
 * Outcome of a booking state change. Every failure mode is a named variant
 * rather than a thrown error, so a route handler maps them to status codes
 * exhaustively and the compiler notices when a new one is added.
 */
export type BookingActionResult =
  | { kind: 'ok'; booking: LoadedBooking }
  | { kind: 'not-found' }
  /** The requested transition isn't legal from the current state. */
  | { kind: 'invalid-state'; status: $Enums.BookingStatus }
  | { kind: 'expired' }
  /** Someone else's accepted booking (or a host block) holds these dates. */
  | { kind: 'dates-unavailable' };

/**
 * Did this error come from the overlap exclusion constraint?
 *
 * Prisma surfaces a raw Postgres error differently depending on how the
 * statement was issued: `PrismaClientKnownRequestError` with `meta.code` for
 * some paths, `PrismaClientUnknownRequestError` with the driver text for
 * others. Rather than enumerate Prisma error codes — which have changed
 * between minor versions — match on the two things Postgres itself guarantees:
 * the SQLSTATE and the constraint name.
 *
 * Deliberately narrow. A broad `catch` here would swallow genuine failures and
 * report them to the host as "those dates just went", which is the most
 * confusing possible lie.
 */
const isOverlapConflict = (err: unknown): boolean => {
  const known =
    err instanceof Prisma.PrismaClientKnownRequestError ? String(err.meta?.code ?? '') : '';
  if (known === '23P01') return true;
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('23P01') || message.includes('bookings_no_accepted_overlap');
};

export async function loadBooking(
  bookingId: string,
  db: PrismaClient = defaultPrisma,
): Promise<LoadedBooking | null> {
  return db.booking.findUnique({ where: { id: bookingId }, select: ACTION_SELECT });
}

/**
 * Host accepts a request.
 *
 * The one genuinely concurrent operation in the system, and the only place that
 * needs an interactive transaction:
 *
 *   1. `SELECT id FROM listings WHERE id = $1 FOR UPDATE` — serialises every
 *      accept for THIS listing. A row lock (not an advisory lock) because
 *      advisory locks are session-scoped and Supabase's pgbouncer runs in
 *      transaction pooling mode, where sessions are not stable across queries.
 *   2. re-read the booking under the lock and confirm it is still PENDING and
 *      unexpired — the state may have changed while we waited for the lock.
 *   3. check for conflicts against accepted bookings AND host blocks.
 *   4. update, and write the guest's notification in the same transaction.
 *
 * The exclusion constraint backstops all of it. If two accepts somehow reach
 * step 4 together, one raises 23P01 and this returns `dates-unavailable`.
 */
export async function acceptBooking(
  bookingId: string,
  hostId: string,
  db: PrismaClient = defaultPrisma,
  now: Date = new Date(),
): Promise<BookingActionResult> {
  const existing = await loadBooking(bookingId, db);
  if (!existing) return { kind: 'not-found' };
  if (existing.listing.hostId !== hostId) return { kind: 'not-found' };
  if (!canTransition(existing.status, 'ACCEPTED', 'host')) {
    return { kind: 'invalid-state', status: existing.status };
  }

  try {
    return await db.$transaction(async (tx) => {
      // 1. Serialise concurrent accepts for this listing.
      await tx.$queryRaw`SELECT id FROM "listings" WHERE id = ${existing.listing.id} FOR UPDATE`;

      // 2. Re-read under the lock. Another accept, a cancel, or the cron may
      //    have moved this booking while we waited.
      const fresh = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, status: true, expiresAt: true, checkIn: true, checkOut: true },
      });
      if (!fresh) return { kind: 'not-found' as const };
      if (fresh.status !== $Enums.BookingStatus.PENDING) {
        return { kind: 'invalid-state' as const, status: fresh.status };
      }
      if (fresh.expiresAt.getTime() <= now.getTime()) return { kind: 'expired' as const };

      const requested: DateRange = { start: fresh.checkIn, end: fresh.checkOut };

      // 3. Conflicts, inside the lock: other accepted bookings AND host blocks.
      //    The constraint covers booking↔booking only; blocks are ours to check.
      const [accepted, blocks] = await Promise.all([
        tx.booking.findMany({
          where: {
            listingId: existing.listing.id,
            status: $Enums.BookingStatus.ACCEPTED,
            id: { not: bookingId },
            checkIn: { lt: fresh.checkOut },
            checkOut: { gt: fresh.checkIn },
          },
          select: { checkIn: true, checkOut: true },
        }),
        tx.availabilityBlock.findMany({
          where: {
            listingId: existing.listing.id,
            startDate: { lt: fresh.checkOut },
            endDate: { gt: fresh.checkIn },
          },
          select: { startDate: true, endDate: true },
        }),
      ]);

      const taken: DateRange[] = [
        ...accepted.map((b) => ({ start: b.checkIn, end: b.checkOut })),
        ...blocks.map((b) => ({ start: b.startDate, end: b.endDate })),
      ];
      if (overlapsAny(requested, taken)) return { kind: 'dates-unavailable' as const };

      // 4. Commit, with the guest's notification in the same transaction.
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: $Enums.BookingStatus.ACCEPTED, acceptedAt: now },
        select: ACTION_SELECT,
      });

      await tx.notification.create({
        data: notificationData(updated.guest.id, 'booking.accepted', {
          bookingId: updated.id,
          listingId: updated.listing.id,
          listingSlug: updated.listing.slug,
          checkIn: updated.checkIn.toISOString().slice(0, 10),
          checkOut: updated.checkOut.toISOString().slice(0, 10),
          by: 'host',
        }),
      });

      return { kind: 'ok' as const, booking: updated };
    });
  } catch (err) {
    // The constraint fired: another transaction took these dates between our
    // check and our write. This is the backstop working, not a server fault.
    if (isOverlapConflict(err)) {
      console.warn(
        JSON.stringify({
          type: 'booking_exclusion_conflict',
          at: new Date().toISOString(),
          bookingId,
          listingId: existing.listing.id,
        }),
      );
      return { kind: 'dates-unavailable' };
    }
    throw err;
  }
}

/** Host declines a pending request. */
export async function declineBooking(
  bookingId: string,
  hostId: string,
  reason: string | undefined,
  db: PrismaClient = defaultPrisma,
  now: Date = new Date(),
): Promise<BookingActionResult> {
  const existing = await loadBooking(bookingId, db);
  if (!existing || existing.listing.hostId !== hostId) return { kind: 'not-found' };
  if (!canTransition(existing.status, 'DECLINED', 'host')) {
    return { kind: 'invalid-state', status: existing.status };
  }

  const booking = await db.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: $Enums.BookingStatus.DECLINED,
        declinedAt: now,
        declineReason: reason ?? null,
      },
      select: ACTION_SELECT,
    });
    await tx.notification.create({
      data: notificationData(updated.guest.id, 'booking.declined', {
        bookingId: updated.id,
        listingSlug: updated.listing.slug,
        by: 'host',
      }),
    });
    return updated;
  });

  return { kind: 'ok', booking };
}

/**
 * Either party cancels.
 *
 * A cancellation after check-in has begun is not a cancellation, it's a
 * complaint — the stay either happened or it didn't, and rewriting it as
 * cancelled would erase the record both sides may later need.
 */
export async function cancelBooking(
  bookingId: string,
  userId: string,
  actor: Extract<BookingActor, 'guest' | 'host'>,
  db: PrismaClient = defaultPrisma,
  now: Date = new Date(),
  todayDateOnly: Date = new Date(),
): Promise<BookingActionResult> {
  const existing = await loadBooking(bookingId, db);
  if (!existing) return { kind: 'not-found' };

  const isOwner =
    actor === 'guest' ? existing.guest.id === userId : existing.listing.hostId === userId;
  if (!isOwner) return { kind: 'not-found' };

  if (!canTransition(existing.status, 'CANCELLED', actor)) {
    return { kind: 'invalid-state', status: existing.status };
  }

  if (
    existing.status === $Enums.BookingStatus.ACCEPTED &&
    existing.checkIn.getTime() <= todayDateOnly.getTime()
  ) {
    return { kind: 'invalid-state', status: existing.status };
  }

  const recipientId = actor === 'guest' ? existing.listing.hostId : existing.guest.id;

  const booking = await db.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: $Enums.BookingStatus.CANCELLED, cancelledAt: now, cancelledBy: actor },
      select: ACTION_SELECT,
    });
    await tx.notification.create({
      data: notificationData(recipientId, 'booking.cancelled', {
        bookingId: updated.id,
        listingSlug: updated.listing.slug,
        by: actor,
      }),
    });
    return updated;
  });

  return { kind: 'ok', booking };
}

/** Shared by the block endpoints: does a range collide with an accepted stay? */
export async function blockConflictsWithBooking(
  listingId: string,
  range: DateRange,
  db: PrismaClient = defaultPrisma,
): Promise<boolean> {
  const accepted = await db.booking.findMany({
    where: {
      listingId,
      status: $Enums.BookingStatus.ACCEPTED,
      checkIn: { lt: range.end },
      checkOut: { gt: range.start },
    },
    select: { checkIn: true, checkOut: true },
  });
  // Overlapping a PENDING request is fine — the host will decline it. Only a
  // confirmed booking is a commitment the host has already made to someone.
  return accepted.some((b) => rangesOverlap(range, { start: b.checkIn, end: b.checkOut }));
}

export const notificationTypeFor = (status: $Enums.BookingStatus): NotificationType =>
  status === 'ACCEPTED'
    ? 'booking.accepted'
    : status === 'DECLINED'
      ? 'booking.declined'
      : status === 'EXPIRED'
        ? 'booking.expired'
        : 'booking.cancelled';
