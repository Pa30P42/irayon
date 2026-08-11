import { apiServerError } from '@/lib/api/api-response';
import { cancelBooking } from '@/lib/api/booking-actions';
import {
  bookingFailureResponse,
  bookingOk,
  sendBookingEmail,
} from '@/lib/api/booking-route-helpers';
import { requireSameOrigin, requireUser } from '@/lib/auth-helpers';
import { todayInBakuDateOnly } from '@/lib/dates-baku';
import { logger } from '@/lib/logger';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string }> };

/** POST /api/host/bookings/:id/cancel — the host backs out of a confirmed stay. */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireUser({ force: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const result = await cancelBooking(
      id,
      auth.user.id,
      'host',
      undefined,
      new Date(),
      todayInBakuDateOnly(),
    );
    if (result.kind !== 'ok') return bookingFailureResponse(result);

    after(() => sendBookingEmail(result.booking, 'cancelled', 'guest'));

    return bookingOk(result.booking);
  } catch (err) {
    logger.error(`POST /api/host/bookings/${id}/cancel failed`, { err });
    return apiServerError();
  }
}
