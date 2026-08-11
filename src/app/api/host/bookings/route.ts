import { apiBadRequestRaw, apiOk, apiServerError } from '@/lib/api/api-response';
import { listHostBookings, type HostBookingFilter } from '@/lib/api/bookings-service';
import { requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

const FILTERS: HostBookingFilter[] = ['pending', 'upcoming', 'past', 'all'];

/** GET /api/host/bookings?filter=pending|upcoming|past|all — the host inbox. */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const raw = new URL(request.url).searchParams.get('filter') ?? 'pending';
  if (!FILTERS.includes(raw as HostBookingFilter)) {
    return apiBadRequestRaw(`filter must be one of: ${FILTERS.join(', ')}`);
  }

  try {
    return apiOk({ data: await listHostBookings(auth.user.id, raw as HostBookingFilter) });
  } catch (err) {
    logger.error('GET /api/host/bookings failed', { err });
    return apiServerError();
  }
}
