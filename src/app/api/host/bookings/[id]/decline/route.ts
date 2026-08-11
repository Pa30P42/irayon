import { apiBadRequest, apiBadRequestRaw, apiServerError } from '@/lib/api/api-response';
import { declineBooking } from '@/lib/api/booking-actions';
import {
  bookingFailureResponse,
  bookingOk,
  sendBookingEmail,
} from '@/lib/api/booking-route-helpers';
import { declineBookingSchema } from '@/lib/api/booking-validator';
import { requireSameOrigin, requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/host/bookings/:id/decline
 *
 * A reason is optional here, unlike a moderation rejection. "Those dates suit
 * me badly" is a complete answer, and forcing prose would produce noise the
 * guest still can't act on.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireUser({ force: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let raw: unknown = {};
  try {
    const text = await request.text();
    if (text) raw = JSON.parse(text);
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }
  const parsed = declineBookingSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);

  try {
    const result = await declineBooking(id, auth.user.id, parsed.data.reason);
    if (result.kind !== 'ok') return bookingFailureResponse(result);

    after(() => sendBookingEmail(result.booking, 'declined', 'guest', parsed.data.reason ?? null));

    return bookingOk(result.booking);
  } catch (err) {
    logger.error(`POST /api/host/bookings/${id}/decline failed`, { err });
    return apiServerError();
  }
}
