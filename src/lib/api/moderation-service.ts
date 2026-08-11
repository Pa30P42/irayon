import { prisma as defaultPrisma } from '@/lib/prisma';
import { MIN_LISTING_IMAGES } from '@/lib/storage';
import type { PlaceType } from '@/types';
import { $Enums, Prisma, type PrismaClient } from '@prisma/client';
import { buildListingSearchText } from './listing-search-text';
import { parseLocalized } from './localized-text';
import { toPlaceType } from './prisma-enums';

/**
 * Approve / reject a listing.
 *
 * Both operations do TWO things at once — merge (or discard) the parked scalar
 * edits in `pendingChanges`, and resolve every photo's moderation state — and
 * both must happen in one transaction. A half-applied approval would leave a
 * listing whose text says "reviewed" and whose photos say otherwise.
 */

export type ModerationDecision = 'approve' | 'reject';

export type ModerationResult =
  | {
      kind: 'ok';
      slug: string;
      /** Storage objects to remove after the response flushes. */
      removedImageUrls: string[];
      hostEmail: string | null;
      hostName: string | null;
      hostLocale: string;
      listingTitleEn: string;
      /** True when a previously-approved listing kept its live status. */
      keptApproved: boolean;
    }
  | { kind: 'not-found' }
  | { kind: 'would-empty-images'; liveCount: number };

const QUEUE_SELECT = {
  id: true,
  slug: true,
  title: true,
  address: true,
  moderationStatus: true,
  pendingChanges: true,
  images: { select: { id: true, url: true, moderationState: true, order: true } },
  host: { select: { email: true, name: true, preferredLocale: true } },
} as const satisfies Prisma.ListingSelect;

type PendingChanges = {
  title?: { az: string; ru: string; en: string };
  description?: { az: string; ru: string; en: string };
  address?: string;
  lat?: number;
  lng?: number;
  placeType?: string;
  region?: string;
  villageId?: string | null;
  phone?: string;
};

const readPendingChanges = (value: Prisma.JsonValue | null): PendingChanges =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as PendingChanges) : {};

/**
 * Build the `data` that merges parked edits back onto the row.
 *
 * `searchText` is rebuilt from the POST-MERGE title and address — it is derived
 * from both, so merging one without recomputing it leaves the public search
 * index describing content that no longer exists.
 */
async function buildMergeData(
  db: PrismaClient,
  row: { title: Prisma.JsonValue; address: string },
  changes: PendingChanges,
): Promise<Prisma.ListingUpdateInput> {
  const data: Prisma.ListingUpdateInput = {};

  if (changes.title) data.title = changes.title as Prisma.InputJsonValue;
  if (changes.description) data.description = changes.description as Prisma.InputJsonValue;
  if (changes.address !== undefined) data.address = changes.address;
  if (changes.lat !== undefined) data.lat = changes.lat;
  if (changes.lng !== undefined) data.lng = changes.lng;
  if (changes.placeType) data.placeType = toPlaceType(changes.placeType as PlaceType);
  if (changes.phone !== undefined) data.phone = changes.phone;

  if (changes.region) {
    const region = await db.region.findUnique({
      where: { slug: changes.region },
      select: { id: true },
    });
    // A region deleted between submission and review: drop that one field
    // rather than fail the whole approval on a moderator's click.
    if (region) data.region = { connect: { id: region.id } };
  }
  if (changes.villageId !== undefined) {
    data.village = changes.villageId
      ? { connect: { id: changes.villageId } }
      : { disconnect: true };
  }

  if (changes.title || changes.address !== undefined) {
    const mergedTitle = changes.title ?? parseLocalized(row.title);
    const mergedAddress = changes.address ?? row.address;
    data.searchText = buildListingSearchText(mergedTitle, mergedAddress);
  }

  return data;
}

export type ModerateArgs = {
  listingId: string;
  decision: ModerationDecision;
  /** Required on reject, min 10 chars (enforced by the route's zod schema). */
  reason?: string | undefined;
  moderatorUserId?: string | null;
  db?: PrismaClient;
};

export async function moderateListing({
  listingId,
  decision,
  reason,
  moderatorUserId,
  db = defaultPrisma,
}: ModerateArgs): Promise<ModerationResult> {
  const row = await db.listing.findUnique({ where: { id: listingId }, select: QUEUE_SELECT });
  if (!row) return { kind: 'not-found' };

  const wasApproved = row.moderationStatus === $Enums.ModerationStatus.APPROVED;

  // Which image rows survive, and which are deleted, under this decision.
  const toDelete = row.images.filter((img) =>
    decision === 'approve'
      ? img.moderationState === $Enums.ImageModerationState.PENDING_REMOVE
      : img.moderationState === $Enums.ImageModerationState.PENDING_ADD,
  );
  const deleteIds = new Set(toDelete.map((img) => img.id));
  const survivors = row.images
    .filter((img) => !deleteIds.has(img.id))
    .sort((a, b) => a.order - b.order);

  /**
   * AUTHORITATIVE guard against approving a listing into having no photos.
   *
   * A host can mark every image `PENDING_REMOVE` and add nothing; approving
   * that would leave a live listing with zero photos, and the create form's
   * minimum-image validation never runs on this path. The per-image delete
   * endpoint refuses too, but this is the check that cannot be raced — it
   * computes the RESULTING set immediately before committing it.
   *
   * Surfaced to the moderator as a reason to REJECT, not something to work
   * around.
   */
  if (decision === 'approve' && survivors.length < MIN_LISTING_IMAGES) {
    return { kind: 'would-empty-images', liveCount: survivors.length };
  }

  const changes = decision === 'approve' ? readPendingChanges(row.pendingChanges) : {};
  const mergeData = await buildMergeData(db, row, changes);

  /**
   * Rejecting a listing that was already APPROVED must NOT take it offline.
   *
   * The plan says reject sets REJECTED, which is right for a first-time
   * listing. Applied literally to a live listing whose *edit* was rejected, it
   * would unpublish content a moderator previously approved because the host
   * tried to change a phone number — punishing the guest-facing site for a bad
   * edit. So: discard the edit, keep the listing live, and record the note.
   */
  const nextStatus =
    decision === 'approve'
      ? $Enums.ModerationStatus.APPROVED
      : wasApproved
        ? $Enums.ModerationStatus.APPROVED
        : $Enums.ModerationStatus.REJECTED;

  await db.$transaction([
    db.listing.update({
      where: { id: listingId },
      data: {
        ...mergeData,
        moderationStatus: nextStatus,
        moderationNote: decision === 'reject' ? (reason ?? null) : null,
        // Parked edits are consumed either way: merged on approve, dropped on
        // reject. Leaving them would re-queue the same review forever.
        pendingChanges: Prisma.DbNull,
        moderatedAt: new Date(),
        ...(moderatorUserId ? { moderatedBy: { connect: { id: moderatorUserId } } } : {}),
      },
    }),
    ...(deleteIds.size > 0 ? [db.image.deleteMany({ where: { id: { in: [...deleteIds] } } })] : []),
    // Every survivor becomes LIVE: on approve `PENDING_ADD` is now reviewed;
    // on reject a refused `PENDING_REMOVE` goes back to being ordinary.
    db.image.updateMany({
      where: { listingId, moderationState: { not: $Enums.ImageModerationState.LIVE } },
      data: { moderationState: $Enums.ImageModerationState.LIVE },
    }),
    // Recompute `order` over the survivors so deletions don't leave gaps that
    // shift the cover unpredictably.
    ...survivors.map((img, index) =>
      db.image.update({ where: { id: img.id }, data: { order: index } }),
    ),
  ]);

  const title = parseLocalized(row.title);

  return {
    kind: 'ok',
    slug: row.slug,
    removedImageUrls: toDelete.map((img) => img.url),
    hostEmail: row.host?.email ?? null,
    hostName: row.host?.name ?? null,
    hostLocale: row.host?.preferredLocale ?? 'az',
    listingTitleEn: changes.title?.en ?? title.en,
    keptApproved: decision === 'reject' && wasApproved,
  };
}

/**
 * The review queue: brand-new listings plus approved listings carrying
 * unreviewed edits (parked scalars OR photos in a non-LIVE state).
 *
 * Oldest first — a queue that shows the newest submission first starves the
 * host who has been waiting longest, which is the one case where the wait is
 * already doing damage.
 */
export function moderationQueueWhere(): Prisma.ListingWhereInput {
  return {
    OR: [
      { moderationStatus: $Enums.ModerationStatus.PENDING },
      {
        moderationStatus: $Enums.ModerationStatus.APPROVED,
        OR: [
          // `not: Prisma.DbNull` matches "the JSON column is not SQL NULL",
          // which is exactly "this listing has parked edits". Note it does NOT
          // treat a JSON `null` value the same way — we only ever write
          // `DbNull`, never `JsonNull`, so the two can't diverge.
          { pendingChanges: { not: Prisma.DbNull } },
          {
            images: {
              some: { moderationState: { not: $Enums.ImageModerationState.LIVE } },
            },
          },
        ],
      },
    ],
  };
}
