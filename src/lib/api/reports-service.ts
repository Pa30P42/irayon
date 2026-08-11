import { prisma as defaultPrisma } from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';
import { parseLocalized } from './localized-text';

/**
 * The moderation report queue.
 *
 * `targetId` is polymorphic and has NO foreign key, so a target can vanish
 * between the report and the review — a listing archived, a message cascaded
 * away with its booking. Resolving the target is therefore a best-effort
 * lookup, and a miss is a normal outcome the queue must render rather than an
 * error. Without that, the queue accumulates rows that crash the page and the
 * reports can never be cleared.
 */

export type ReportTarget =
  | { kind: 'listing'; label: string; href: string | null }
  | { kind: 'user'; label: string; href: string | null }
  | { kind: 'message'; label: string; conversationId: string | null }
  /** The reported thing no longer exists. Still resolvable. */
  | { kind: 'missing' };

export type ReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  note: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  reporter: { id: string; name: string | null; email: string };
  target: ReportTarget;
};

async function resolveTarget(
  targetType: string,
  targetId: string,
  db: PrismaClient,
): Promise<ReportTarget> {
  if (targetType === 'listing') {
    const listing = await db.listing.findUnique({
      where: { id: targetId },
      select: { slug: true, title: true },
    });
    return listing
      ? {
          kind: 'listing',
          label: parseLocalized(listing.title).en,
          href: `/listings/${listing.slug}`,
        }
      : { kind: 'missing' };
  }

  if (targetType === 'user') {
    const user = await db.user.findUnique({
      where: { id: targetId },
      select: { name: true, email: true },
    });
    return user
      ? { kind: 'user', label: user.name ?? user.email, href: null }
      : { kind: 'missing' };
  }

  if (targetType === 'message') {
    const message = await db.message.findUnique({
      where: { id: targetId },
      select: { body: true, conversationId: true },
    });
    return message
      ? {
          kind: 'message',
          // Truncated: the queue is a triage list, not a reading view. The full
          // thread is behind the audited link.
          label: message.body.slice(0, 140),
          conversationId: message.conversationId,
        }
      : { kind: 'missing' };
  }

  return { kind: 'missing' };
}

export async function listReports(
  includeResolved: boolean,
  db: PrismaClient = defaultPrisma,
): Promise<ReportRow[]> {
  const rows = await db.report.findMany({
    where: includeResolved ? {} : { resolvedAt: null },
    // Unresolved first, then oldest first — the queue should drain from the
    // front, not from whatever was reported most recently.
    orderBy: [{ resolvedAt: 'asc' }, { createdAt: 'asc' }],
    take: 100,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      note: true,
      createdAt: true,
      resolvedAt: true,
      resolution: true,
      reporter: { select: { id: true, name: true, email: true } },
    },
  });

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      targetType: row.targetType,
      targetId: row.targetId,
      reason: row.reason,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      resolution: row.resolution,
      reporter: row.reporter,
      target: await resolveTarget(row.targetType, row.targetId, db),
    })),
  );
}
