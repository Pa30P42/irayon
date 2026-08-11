import type { Prisma } from '@prisma/client';

/**
 * In-app notifications.
 *
 * **These rows are the system of record.** A notification is written INSIDE the
 * same transaction as the state change it describes, so "your booking was
 * accepted" cannot exist without the acceptance, and the acceptance cannot
 * commit without the notification.
 *
 * Email is a best-effort layer on top, sent from `after()`. It has no retry and
 * no outbox, so it must never be the only place a user could learn something
 * happened — which is exactly what it would be if we sent mail and skipped the
 * row.
 */

export type NotificationType =
  | 'booking.requested'
  | 'booking.accepted'
  | 'booking.declined'
  | 'booking.expired'
  | 'booking.cancelled'
  | 'message.new';

export type NotificationPayload = {
  bookingId?: string;
  listingId?: string;
  listingSlug?: string;
  /** English title, for rendering the row without a second query. */
  listingTitle?: string;
  checkIn?: string;
  checkOut?: string;
  conversationId?: string;
  /** Who triggered it — 'guest' | 'host' | 'system'. */
  by?: string;
};

/**
 * Builds the `create` argument for a notification.
 *
 * Returned as data rather than executed, so callers pass it to `tx.notification
 * .create(...)` inside their own transaction. Making the caller supply the
 * transaction client is what stops someone writing a notification outside one.
 */
export function notificationData(
  userId: string,
  type: NotificationType,
  payload: NotificationPayload = {},
): Prisma.NotificationCreateArgs['data'] {
  return {
    userId,
    type,
    data: payload as Prisma.InputJsonValue,
  };
}
