import {
  apiBadRequest,
  apiBadRequestRaw,
  apiConflict,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import {
  findConversationById,
  listMessages,
  participantRole,
} from '@/lib/api/conversations-service';
import { sendNewMessageEmail } from '@/lib/api/message-email';
import { MAX_MESSAGES_PER_CONVERSATION, sendMessageSchema } from '@/lib/api/messaging-validator';
import { notificationData } from '@/lib/api/notifications';
import { requireSameOrigin, requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/conversations/:id/messages
 *
 * Participation is re-derived on every request from the booking, so access
 * can't outlive the relationship that granted it. A non-participant gets 404,
 * not 403 — a 403 would confirm the thread exists.
 */
export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const conversation = await findConversationById(id);
    if (!conversation || !participantRole(conversation, auth.user.id)) {
      return apiNotFound('Not found');
    }
    return apiOk({ data: await listMessages(id, auth.user.id) });
  } catch (err) {
    logger.error(`GET /api/conversations/${id}/messages failed`, { err });
    return apiServerError();
  }
}

/** POST /api/conversations/:id/messages */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireUser({ force: true });
  if (!auth.ok) return auth.response;

  const rate = await checkRateLimit('messageSend', auth.user.id);
  if (!rate.success) {
    return new Response(JSON.stringify({ error: { message: 'Too many messages' } }), {
      status: 429,
      headers: { 'content-type': 'application/json', ...rateLimitHeaders(rate) },
    });
  }

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }
  const parsed = sendMessageSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);

  try {
    const conversation = await findConversationById(id);
    if (!conversation) return apiNotFound('Not found');

    const role = participantRole(conversation, auth.user.id);
    if (!role) return apiNotFound('Not found');

    // Per-thread cap. The per-user rate limit bounds burst speed; this bounds
    // total size, so one long-running argument can't make the thread view
    // unloadable for both parties.
    const count = await prisma.message.count({ where: { conversationId: id } });
    if (count >= MAX_MESSAGES_PER_CONVERSATION) {
      return apiConflict('conversation_full');
    }

    const recipientId =
      role === 'guest' ? conversation.booking.listing.hostId : conversation.booking.guestId;

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId: id, senderId: auth.user.id, body: parsed.data.body },
        select: { id: true, body: true, createdAt: true, senderId: true },
      });

      // `lastMessageAt` drives the thread list's sort and both sides' unread
      // comparison, so it moves in the same transaction as the message itself.
      await tx.conversation.update({
        where: { id },
        data: {
          lastMessageAt: created.createdAt,
          // The sender has, by definition, read their own message.
          ...(role === 'guest'
            ? { guestLastReadAt: created.createdAt }
            : { hostLastReadAt: created.createdAt }),
        },
      });

      await tx.notification.create({
        data: notificationData(recipientId, 'message.new', {
          conversationId: id,
          bookingId: conversation.booking.id,
          listingSlug: conversation.booking.listing.slug,
        }),
      });

      return created;
    });

    after(() => sendNewMessageEmail(id, auth.user.id));

    return apiOk(
      {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        senderId: message.senderId,
        senderName: auth.user.name,
        mine: true,
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error(`POST /api/conversations/${id}/messages failed`, { err });
    return apiServerError();
  }
}
