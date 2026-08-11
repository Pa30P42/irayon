import { apiServerError } from '@/lib/api/api-response';
import { acceptBooking } from '@/lib/api/booking-actions';
import {
  bookingFailureResponse,
  bookingOk,
  sendBookingEmail,
} from '@/lib/api/booking-route-helpers';
import { requireSameOrigin, requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/host/bookings/:id/accept
 *
 * The only genuinely concurrent operation in the system. All of the interesting
 * work — the listing row lock, the re-read under it, the overlap check, and the
 * 23P01 backstop — lives in `acceptBooking`.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireUser({ force: true });
  if (!auth.ok) return auth.response;

  const rate = await checkRateLimit('hostAction', auth.user.id);
  if (!rate.success) {
    return new Response(JSON.stringify({ error: { message: 'Too many actions' } }), {
      status: 429,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { id } = await params;

  try {
    const result = await acceptBooking(id, auth.user.id);
    if (result.kind !== 'ok') return bookingFailureResponse(result);

    // Email is best-effort ON TOP of the notification row the transaction
    // already committed. The guest can see the acceptance in-app either way.
    after(() => sendBookingEmail(result.booking, 'accepted', 'guest'));

    return bookingOk(result.booking);
  } catch (err) {
    logger.error(`POST /api/host/bookings/${id}/accept failed`, { err });
    return apiServerError();
  }
}
