import { apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { ensureConversationForBooking, participantRole } from '@/lib/api/conversations-service';
import { requireSameOrigin, requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/bookings/:id/conversation — open (or create) the thread.
 *
 * Threads are created lazily on first access rather than alongside every
 * booking: most requests are declined or expire without a word, and an empty
 * thread each would be a row and an index entry bought for nothing.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    // Authorise against the BOOKING before creating anything — otherwise this
    // endpoint would happily mint a conversation row for a stranger's booking
    // and only then refuse them.
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, guestId: true, listing: { select: { hostId: true } } },
    });
    if (!booking) return apiNotFound('Not found');
    if (booking.guestId !== auth.user.id && booking.listing.hostId !== auth.user.id) {
      return apiNotFound('Not found');
    }

    const conversation = await ensureConversationForBooking(id);
    // Belt and braces: re-derive the role from the created row too.
    if (!participantRole(conversation, auth.user.id)) return apiNotFound('Not found');

    return apiOk({ id: conversation.id });
  } catch (err) {
    logger.error(`POST /api/bookings/${id}/conversation failed`, { err });
    return apiServerError();
  }
}
