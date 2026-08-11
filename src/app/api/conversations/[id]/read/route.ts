import { apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { findConversationById, participantRole } from '@/lib/api/conversations-service';
import { requireSameOrigin, requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/conversations/:id/read — move this side's read cursor to now.
 *
 * Also clears the `message.new` notifications for this thread, so the header
 * badge and the thread's own unread state can't disagree — a badge that keeps
 * counting a thread you're currently reading is worse than no badge.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const conversation = await findConversationById(id);
    if (!conversation) return apiNotFound('Not found');
    const role = participantRole(conversation, auth.user.id);
    if (!role) return apiNotFound('Not found');

    const now = new Date();
    await prisma.$transaction([
      prisma.conversation.update({
        where: { id },
        data: role === 'guest' ? { guestLastReadAt: now } : { hostLastReadAt: now },
      }),
      prisma.notification.updateMany({
        where: {
          userId: auth.user.id,
          type: 'message.new',
          readAt: null,
          // Prisma can't index into JSON in a where clause portably, so scope
          // by user + type and filter the payload with a path condition.
          data: { path: ['conversationId'], equals: id },
        },
        data: { readAt: now },
      }),
    ]);

    return apiOk({ ok: true });
  } catch (err) {
    logger.error(`POST /api/conversations/${id}/read failed`, { err });
    return apiServerError();
  }
}
