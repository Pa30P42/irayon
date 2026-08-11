import { invalidateUserCache } from '@/lib/auth-helpers';
import { prisma as defaultPrisma } from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';

/**
 * Admin actions on user accounts.
 *
 * Every one of these bumps `sessionVersion`, which is what actually ends a
 * live session: the JWT carries `sv`, and the next strict check compares it to
 * the database, fails, and expires the cookie. Without the bump a suspended
 * user keeps a valid token until it expires on its own — up to 30 days of
 * access after being suspended.
 *
 * The cached strict-check row is invalidated too. The 60s TTL would eventually
 * do it, but "eventually" is the wrong word for a suspension.
 */

export async function suspendUser(
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<{ suspendedAt: Date } | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return null;
  // Refuse to suspend an admin through this path. Locking the operator out of
  // their own platform should require deliberate database access, not a
  // misclick in a list.
  if (user.role === 'ADMIN') return null;

  const updated = await db.user.update({
    where: { id: userId },
    data: { suspendedAt: new Date(), sessionVersion: { increment: 1 } },
    select: { suspendedAt: true },
  });
  await invalidateUserCache(userId);
  return updated as { suspendedAt: Date };
}

export async function unsuspendUser(
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<boolean> {
  const { count } = await db.user.updateMany({
    where: { id: userId },
    // No sessionVersion bump: un-suspending doesn't need to invalidate
    // anything, and the user has no live session to preserve anyway.
    data: { suspendedAt: null },
  });
  if (count > 0) await invalidateUserCache(userId);
  return count > 0;
}

/** Sign a user out everywhere without suspending them. */
export async function revokeSessions(
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<boolean> {
  const { count } = await db.user.updateMany({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
  if (count > 0) await invalidateUserCache(userId);
  return count > 0;
}

export type AnonymiseResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'not-found' | 'is-admin' };

/**
 * Account deletion, implemented as ANONYMISATION.
 *
 * The row cannot be deleted: `Booking.guestId` and `Message.senderId` are both
 * `Restrict`, deliberately, because booking history is the support and legal
 * record the platform exists to be able to produce, and a message with no
 * author is a hole in a conversation somebody may need to read later.
 *
 * So: strip the identifying fields, release the email (so the person could
 * sign up again), suspend, revoke, and archive their listings. What survives is
 * the shape of what happened, with nobody's name on it.
 */
export async function anonymiseUser(
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<AnonymiseResult> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { ok: false, reason: 'not-found' };
  if (user.role === 'ADMIN') return { ok: false, reason: 'is-admin' };

  // `.invalid` is reserved by RFC 2606 and can never be registered, so the
  // replacement address can never collide with a real one or receive mail.
  const email = `deleted+${userId}@irayon.invalid`;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        name: null,
        image: null,
        phone: null,
        email,
        suspendedAt: new Date(),
        sessionVersion: { increment: 1 },
      },
    }),
    // Their listings come down, but are not deleted — bookings reference them.
    db.listing.updateMany({ where: { hostId: userId }, data: { status: 'ARCHIVED' } }),
    // OAuth links go: nothing should be able to sign back into this row.
    db.account.deleteMany({ where: { userId } }),
    db.session.deleteMany({ where: { userId } }),
  ]);

  await invalidateUserCache(userId);
  return { ok: true, email };
}
