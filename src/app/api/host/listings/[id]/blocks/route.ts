import {
  apiBadRequest,
  apiBadRequestRaw,
  apiConflict,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { blockConflictsWithBooking } from '@/lib/api/booking-actions';
import { createBlockSchema } from '@/lib/api/booking-validator';
import { requireListingOwner, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ id: string }> };

/** GET — every block on this listing, for the host calendar. */
export async function GET(request: Request, { params }: Context): Promise<Response> {
  const { id } = await params;
  const auth = await requireListingOwner(id);
  if (!auth.ok) return auth.response;

  try {
    const blocks = await prisma.availabilityBlock.findMany({
      where: { listingId: id },
      orderBy: { startDate: 'asc' },
      select: { id: true, startDate: true, endDate: true, note: true },
    });
    return apiOk({
      data: blocks.map((b) => ({
        id: b.id,
        start: b.startDate.toISOString().slice(0, 10),
        end: b.endDate.toISOString().slice(0, 10),
        note: b.note,
      })),
    });
  } catch (err) {
    logger.error(`GET /api/host/listings/${id}/blocks failed`, { err });
    return apiServerError();
  }
}

/**
 * POST — close off dates.
 *
 * Refused when the range collides with an ACCEPTED booking: the host has
 * already promised those nights to someone, and letting a block silently
 * override that would produce a guest holding a confirmation for a date the
 * calendar says is unavailable.
 *
 * Overlapping a PENDING request is fine — the host will decline it, and that
 * decline is a message the guest gets, unlike a block appearing underneath
 * them.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const { id } = await params;
  const auth = await requireListingOwner(id, { force: true });
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }
  const parsed = createBlockSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);

  const range = { start: parsed.data.startDate, end: parsed.data.endDate };

  try {
    // The same `rangesOverlap` the accept path uses, from the other direction.
    // Without this, the exclusion constraint would cover booking↔booking only
    // and the availability endpoint would merely *display* the merged sets.
    if (await blockConflictsWithBooking(id, range)) {
      return apiConflict('dates_booked');
    }

    const block = await prisma.availabilityBlock.create({
      data: {
        listingId: id,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        note: parsed.data.note ?? null,
      },
      select: { id: true, startDate: true, endDate: true, note: true },
    });

    return apiOk(
      {
        id: block.id,
        start: block.startDate.toISOString().slice(0, 10),
        end: block.endDate.toISOString().slice(0, 10),
        note: block.note,
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error(`POST /api/host/listings/${id}/blocks failed`, { err });
    return apiServerError();
  }
}
