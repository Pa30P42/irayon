import { auth } from '@/auth';
import { apiOk } from '@/lib/api/api-response';
import { countUnreadNotifications } from '@/lib/api/bookings-service';
import { logger } from '@/lib/logger';

/**
 * GET /api/account/unread — header badge count.
 *
 * Like `/api/account/me`, this never 401s: an anonymous visitor has zero
 * unread notifications, which is a normal answer, not an error. Stage 3 adds a
 * second counter here for unread messages rather than introducing a parallel
 * endpoint late.
 */
export async function GET(): Promise<Response> {
  try {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return apiOk({ notifications: 0 });
    return apiOk({ notifications: await countUnreadNotifications(id) });
  } catch (err) {
    logger.error('GET /api/account/unread failed', { err });
    return apiOk({ notifications: 0 });
  }
}
