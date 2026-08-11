import type { ConversationRole } from './conversations-service';

/**
 * Should a "you have a new message" email go out?
 *
 * Extracted as a pure function because the first version of this had a real
 * bug that no amount of reading caught: the debounce marker was a single
 * per-conversation column, so emailing the host about a guest's message
 * suppressed the email to the guest about the host's reply. The reply silently
 * never reached them.
 *
 * Both cursors are per-recipient for exactly that reason, and the decision is
 * testable without a database.
 */

export type EmailDecisionInput = {
  /** Who just sent the message. The recipient is the other side. */
  senderRole: ConversationRole;
  lastMessageAt: Date | null;
  guestLastReadAt: Date | null;
  hostLastReadAt: Date | null;
  guestLastEmailedAt: Date | null;
  hostLastEmailedAt: Date | null;
};

export type EmailDecision =
  | { send: true }
  | { send: false; reason: 'no-messages' | 'recipient-caught-up' | 'already-emailed' };

export function decideMessageEmail(input: EmailDecisionInput): EmailDecision {
  const { senderRole, lastMessageAt } = input;
  if (!lastMessageAt) return { send: false, reason: 'no-messages' };

  // The recipient is whichever side didn't send.
  const recipientLastRead = senderRole === 'guest' ? input.hostLastReadAt : input.guestLastReadAt;
  const recipientLastEmailed =
    senderRole === 'guest' ? input.hostLastEmailedAt : input.guestLastEmailedAt;

  // 1. If they've read up to now, they're plainly looking at the thread.
  if (recipientLastRead && recipientLastRead >= lastMessageAt) {
    return { send: false, reason: 'recipient-caught-up' };
  }

  // 2. One email per unread stretch. The stretch begins at the recipient's read
  //    cursor; an email sent after that point has already done its job, so ten
  //    messages in a row is one email rather than ten.
  if (recipientLastEmailed && (!recipientLastRead || recipientLastEmailed > recipientLastRead)) {
    return { send: false, reason: 'already-emailed' };
  }

  return { send: true };
}
