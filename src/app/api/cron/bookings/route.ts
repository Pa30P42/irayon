import { apiOk, apiServerError } from '@/lib/api/api-response';
import { notificationData } from '@/lib/api/notifications';
import { authorizeCronRequest, pingHeartbeat } from '@/lib/cron-auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { $Enums } from '@prisma/client';

/**
 * GET /api/cron/bookings — hourly sweep.
 *
 * Two jobs:
 *   - expire PENDING requests whose `expiresAt` has passed;
 *   - complete ACCEPTED bookings whose stay has ended.
 *
 * Both need application logic (notifications, and later emails), which is why
 * this is a route rather than a Postgres job.
 *
 * NOT exempt from authentication — exempt from the ORIGIN check specifically.
 * See `cron-auth.ts`.
 */

/**
 * Per-invocation cap.
 *
 * A backlog is bounded work, but an unbounded sweep is an unbounded function
 * timeout: the run dies partway, retries from the top next hour, and never
 * catches up. Taking the oldest 100 makes progress monotonic, and the remaining
 * count is logged so a growing backlog is visible rather than inferred.
 */
const BATCH_LIMIT = 100;

export async function GET(request: Request): Promise<Response> {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    logger.error('cron auth failed', { status: auth.status, message: auth.message });
    return new Response(JSON.stringify({ error: { message: auth.message } }), {
      status: auth.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const now = new Date();

  try {
    // --- Expire stale pending requests ------------------------------------
    const stale = await prisma.booking.findMany({
      where: { status: $Enums.BookingStatus.PENDING, expiresAt: { lte: now } },
      orderBy: { expiresAt: 'asc' },
      take: BATCH_LIMIT,
      select: {
        id: true,
        guestId: true,
        listing: { select: { id: true, slug: true, hostId: true } },
      },
    });

    for (const booking of stale) {
      // One transaction per booking rather than one for the batch: a single
      // problematic row must not roll back the other 99, and each booking's
      // notification still commits atomically with its own status change.
      await prisma.$transaction(async (tx) => {
        const updated = await tx.booking.updateMany({
          // Re-assert PENDING: a host may have accepted this in the seconds
          // since the SELECT, and the cron must never overwrite that.
          where: { id: booking.id, status: $Enums.BookingStatus.PENDING },
          data: { status: $Enums.BookingStatus.EXPIRED },
        });
        if (updated.count === 0) return;

        // Both parties are told — the guest that nothing came of it, the host
        // that the request left their inbox without them acting.
        await tx.notification.createMany({
          data: [
            notificationData(booking.guestId, 'booking.expired', {
              bookingId: booking.id,
              listingSlug: booking.listing.slug,
              by: 'system',
            }),
            notificationData(booking.listing.hostId, 'booking.expired', {
              bookingId: booking.id,
              listingSlug: booking.listing.slug,
              by: 'system',
            }),
          ],
        });
      });
    }

    // --- Complete finished stays ------------------------------------------
    const finished = await prisma.booking.findMany({
      where: { status: $Enums.BookingStatus.ACCEPTED, checkOut: { lte: now } },
      orderBy: { checkOut: 'asc' },
      take: BATCH_LIMIT,
      select: { id: true },
    });

    const completed = finished.length
      ? await prisma.booking.updateMany({
          where: {
            id: { in: finished.map((b) => b.id) },
            status: $Enums.BookingStatus.ACCEPTED,
          },
          data: { status: $Enums.BookingStatus.COMPLETED },
        })
      : { count: 0 };

    // --- Backlog visibility -----------------------------------------------
    const [remainingExpired, remainingCompleted] = await Promise.all([
      prisma.booking.count({
        where: { status: $Enums.BookingStatus.PENDING, expiresAt: { lte: now } },
      }),
      prisma.booking.count({
        where: { status: $Enums.BookingStatus.ACCEPTED, checkOut: { lte: now } },
      }),
    ]);

    const summary = {
      expired: stale.length,
      completed: completed.count,
      remainingExpired,
      remainingCompleted,
    };

    console.warn(JSON.stringify({ type: 'cron_bookings_done', at: now.toISOString(), ...summary }));

    await pingHeartbeat('success');
    return apiOk({ ok: true, ...summary });
  } catch (err) {
    logger.error('GET /api/cron/bookings failed', { err });
    // Tell the monitor explicitly rather than letting it infer failure from a
    // missing ping an hour later.
    await pingHeartbeat('fail');
    return apiServerError('Cron run failed');
  }
}
