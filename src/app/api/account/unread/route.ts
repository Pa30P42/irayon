import { auth } from '@/auth';
import { apiOk } from '@/lib/api/api-response';
import { countUnreadNotifications } from '@/lib/api/bookings-service';
import { countUnreadConversations } from '@/lib/api/conversations-service';
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
    if (!id) return apiOk({ notifications: 0, messages: 0 });

    // Two independent counters rather than one total: the header shows a
    // single badge today, but "3 messages" and "3 booking updates" are
    // different things and the UI shouldn't have to guess which it has.
    const [notifications, messages] = await Promise.all([
      countUnreadNotifications(id),
      countUnreadConversations(id),
    ]);
    return apiOk({ notifications, messages });
  } catch (err) {
    logger.error('GET /api/account/unread failed', { err });
    return apiOk({ notifications: 0, messages: 0 });
  }
}
