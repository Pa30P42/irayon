import { prisma as defaultPrisma } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@prisma/client';
import { isUsingMockData } from './listings-service';
import { parseLocalized } from './localized-text';

/**
 * Message threads, one per booking.
 *
 * **Participants are derived, never stored.** A thread's members are the
 * booking's guest and the listing's host, resolved on every access. There is no
 * membership table, so there is nothing to drift out of sync with who the
 * booking actually belongs to — and no way for a stale row to grant someone
 * access to a conversation they were removed from.
 */

export type ConversationRole = 'guest' | 'host';

const PARTICIPANT_SELECT = {
  id: true,
  guestLastReadAt: true,
  hostLastReadAt: true,
  lastMessageAt: true,
  guestLastEmailedAt: true,
  hostLastEmailedAt: true,
  booking: {
    select: {
      id: true,
      guestId: true,
      checkIn: true,
      checkOut: true,
      status: true,
      guest: { select: { id: true, name: true, email: true, image: true, preferredLocale: true } },
      listing: {
        select: {
          id: true,
          slug: true,
          title: true,
          hostId: true,
          host: {
            select: { id: true, name: true, email: true, image: true, preferredLocale: true },
          },
        },
      },
    },
  },
} as const satisfies Prisma.ConversationSelect;

export type ConversationRow = Prisma.ConversationGetPayload<{ select: typeof PARTICIPANT_SELECT }>;

/**
 * Which side of a conversation this user is on, or `null` if neither.
 *
 * Every read and write goes through this. An admin is deliberately NOT given a
 * role here: reading private correspondence is a moderation action with its own
 * audited path (see `/admin/reports`), not something that should fall out of a
 * generic permission check.
 */
export function participantRole(
  conversation: ConversationRow,
  userId: string,
): ConversationRole | null {
  if (conversation.booking.guestId === userId) return 'guest';
  if (conversation.booking.listing.hostId === userId) return 'host';
  return null;
}

export async function findConversationById(
  conversationId: string,
  db: PrismaClient = defaultPrisma,
): Promise<ConversationRow | null> {
  return db.conversation.findUnique({ where: { id: conversationId }, select: PARTICIPANT_SELECT });
}

/**
 * The thread for a booking, created on first access.
 *
 * Lazy rather than created alongside every booking: most requests are declined
 * or expire without a word being exchanged, and an empty thread per booking is
 * a row and an index entry bought for nothing.
 *
 * `upsert` on the unique `bookingId` rather than find-then-create, so two
 * simultaneous first messages can't produce two threads.
 */
export async function ensureConversationForBooking(
  bookingId: string,
  db: PrismaClient = defaultPrisma,
): Promise<ConversationRow> {
  return db.conversation.upsert({
    where: { bookingId },
    create: { bookingId },
    update: {},
    select: PARTICIPANT_SELECT,
  });
}

export type ConversationSummary = {
  id: string;
  bookingId: string;
  listing: { slug: string; title: string };
  otherParty: { name: string | null; image: string | null };
  lastMessageAt: string | null;
  unread: boolean;
  checkIn: string;
  checkOut: string;
  status: string;
};

const toSummary = (row: ConversationRow, role: ConversationRole): ConversationSummary => {
  const lastRead = role === 'guest' ? row.guestLastReadAt : row.hostLastReadAt;
  const other = role === 'guest' ? row.booking.listing.host : row.booking.guest;
  return {
    id: row.id,
    bookingId: row.booking.id,
    listing: {
      slug: row.booking.listing.slug,
      title: parseLocalized(row.booking.listing.title).en,
    },
    otherParty: { name: other?.name ?? null, image: other?.image ?? null },
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    // Unread when a message landed after this side last looked. A timestamp
    // comparison rather than a per-message flag: one indexed read, no join.
    unread: row.lastMessageAt !== null && (lastRead === null || row.lastMessageAt > lastRead),
    checkIn: row.booking.checkIn.toISOString().slice(0, 10),
    checkOut: row.booking.checkOut.toISOString().slice(0, 10),
    status: row.booking.status.toLowerCase(),
  };
};

/** Every thread this user participates in, newest activity first. */
export async function listConversationsForUser(
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<ConversationSummary[]> {
  if (isUsingMockData()) return [];

  const rows = await db.conversation.findMany({
    where: {
      OR: [{ booking: { guestId: userId } }, { booking: { listing: { hostId: userId } } }],
    },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    take: 100,
    select: PARTICIPANT_SELECT,
  });

  return rows
    .map((row) => {
      const role = participantRole(row, userId);
      return role ? toSummary(row, role) : null;
    })
    .filter((summary): summary is ConversationSummary => summary !== null);
}

export type MessageDto = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string | null;
  /** True when the signed-in reader wrote it — drives left/right alignment. */
  mine: boolean;
};

export async function listMessages(
  conversationId: string,
  viewerId: string,
  db: PrismaClient = defaultPrisma,
): Promise<MessageDto[]> {
  const rows = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderId: true,
      sender: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    senderId: row.senderId,
    senderName: row.sender.name,
    mine: row.senderId === viewerId,
  }));
}

/** Unread thread count for the header badge. */
export async function countUnreadConversations(
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<number> {
  if (isUsingMockData()) return 0;

  // Expressed as two branches rather than one clever OR: "I'm the guest and a
  // message arrived after my cursor" and the same for the host. Prisma can't
  // compare two columns directly, so the cursor comparison is done in memory
  // over a deliberately narrow select.
  const rows = await db.conversation.findMany({
    where: {
      lastMessageAt: { not: null },
      OR: [{ booking: { guestId: userId } }, { booking: { listing: { hostId: userId } } }],
    },
    select: {
      lastMessageAt: true,
      guestLastReadAt: true,
      hostLastReadAt: true,
      booking: { select: { guestId: true } },
    },
  });

  return rows.filter((row) => {
    const isGuest = row.booking.guestId === userId;
    const lastRead = isGuest ? row.guestLastReadAt : row.hostLastReadAt;
    return lastRead === null || (row.lastMessageAt !== null && row.lastMessageAt > lastRead);
  }).length;
}
