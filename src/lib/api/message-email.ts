import { SITE } from '@/lib/constants';
import { sendEmail } from '@/lib/email/send-email';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { findConversationById, participantRole } from './conversations-service';
import { decideMessageEmail } from './message-email-policy';

/**
 * "You have a new message" email.
 *
 * The whole decision — is the recipient behind, and have we already told them
 * during this unread stretch — lives in `decideMessageEmail`, which is pure and
 * exhaustively tested. This function is only the I/O around it.
 *
 * Best-effort by construction: the `message.new` notification row is already
 * committed by the time this runs, so the recipient sees the message in-app
 * whether or not any mail leaves the building.
 */
export async function sendNewMessageEmail(conversationId: string, senderId: string): Promise<void> {
  try {
    const conversation = await findConversationById(conversationId);
    if (!conversation) return;

    const senderRole = participantRole(conversation, senderId);
    if (!senderRole) return;

    const decision = decideMessageEmail({
      senderRole,
      lastMessageAt: conversation.lastMessageAt,
      guestLastReadAt: conversation.guestLastReadAt,
      hostLastReadAt: conversation.hostLastReadAt,
      guestLastEmailedAt: conversation.guestLastEmailedAt,
      hostLastEmailedAt: conversation.hostLastEmailedAt,
    });
    if (!decision.send) return;

    const recipient =
      senderRole === 'guest' ? conversation.booking.listing.host : conversation.booking.guest;
    if (!recipient?.email) return;

    // Stamp BEFORE sending. If the send then fails the recipient still has the
    // in-app notification, and a flaky provider can't produce a storm of
    // duplicate mail on retry.
    await prisma.conversation.update({
      where: { id: conversationId },
      data:
        senderRole === 'guest'
          ? { hostLastEmailedAt: new Date() }
          : { guestLastEmailedAt: new Date() },
    });

    const locale = recipient.preferredLocale;
    const path = senderRole === 'guest' ? 'host/messages' : 'account/messages';

    await sendEmail({
      to: recipient.email,
      locale,
      template: 'message-new',
      data: {
        listingTitle: conversation.booking.listing.slug,
        actionUrl: `${SITE.url}/${locale}/${path}/${conversationId}`,
        recipientName: recipient.name,
      },
    });
  } catch (err) {
    logger.error('new-message email failed', { err, conversationId });
  }
}
