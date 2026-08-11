import { prisma as defaultPrisma } from '@/lib/prisma';
import type { Listing } from '@/types';
import { $Enums, Prisma, type PrismaClient } from '@prisma/client';
import {
  pickPendingChanges,
  significantChanges,
  type ListingModerationSnapshot,
  type ModerationActor,
  type SignificantField,
} from './listing-moderation';
import type { CreateListingInput } from './listings-create-validator';
import { updateListingFromDb } from './listings-service-db';
import { parseLocalized } from './localized-text';

/**
 * ONE update path for both cabinets.
 *
 * The admin and host flows differ only in the `actor` passed here — there is no
 * second function, no forked handler, and no "admin version" of the write. Two
 * write paths for the same table is precisely how the two flows would drift
 * into subtly different behaviour, with the security-relevant half being the
 * one nobody exercises.
 *
 * **What the actor decides.** On the admin path `significantChanges` is never
 * consulted, `pendingChanges` is never populated, and the row is stamped as
 * moderated. Moderation gates untrusted input, and an admin is not untrusted
 * input — after the B1 backfill the admin is the host of every legacy listing
 * and would otherwise be queueing edits for their own approval.
 */

export type ListingUpdateOutcome =
  /** Everything applied live; the public site should be revalidated. */
  | { kind: 'applied'; listing: Listing }
  /**
   * Significant edits are parked in `pendingChanges` awaiting review. The live
   * listing is UNCHANGED for those fields — it never goes offline during
   * re-moderation — but non-significant fields in the same payload did apply.
   */
  | { kind: 'queued'; listing: Listing; fields: SignificantField[] }
  | { kind: 'not-found' };

const SNAPSHOT_SELECT = {
  id: true,
  title: true,
  description: true,
  address: true,
  lat: true,
  lng: true,
  placeType: true,
  villageId: true,
  phone: true,
  moderationStatus: true,
  region: { select: { slug: true } },
} as const satisfies Prisma.ListingSelect;

type SnapshotRow = Prisma.ListingGetPayload<{ select: typeof SNAPSHOT_SELECT }>;

const DTO_PLACE_TYPE: Record<string, string> = {
  A_FRAME: 'a-frame',
  VILLA_COTTAGE: 'villa-cottage',
  HOTEL: 'hotel',
  MODULAR: 'modular',
  VILLAGE_ROOM: 'village-room',
};

const toSnapshot = (row: SnapshotRow): ListingModerationSnapshot => ({
  title: parseLocalized(row.title),
  description: parseLocalized(row.description),
  address: row.address,
  lat: row.lat,
  lng: row.lng,
  // Compare in DTO form, which is what the payload carries.
  placeType: DTO_PLACE_TYPE[row.placeType] ?? 'villa-cottage',
  region: row.region.slug,
  villageId: row.villageId,
  phone: row.phone,
});

export type UpdateListingArgs = {
  listingId: string;
  input: CreateListingInput;
  actor: ModerationActor;
  /** Auth.js user id of the acting admin; stamped onto the moderation columns. */
  actorUserId?: string | null;
  db?: PrismaClient;
};

export async function updateListingAsActor({
  listingId,
  input,
  actor,
  actorUserId,
  db = defaultPrisma,
}: UpdateListingArgs): Promise<ListingUpdateOutcome> {
  const row = await db.listing.findUnique({ where: { id: listingId }, select: SNAPSHOT_SELECT });
  if (!row) return { kind: 'not-found' };

  if (actor === 'admin') {
    // Admin edits apply live and are, by definition, reviewed. A queued PENDING
    // listing that an admin edits directly is promoted to APPROVED — the admin
    // just looked at it, which is what approval means.
    const listing = await updateListingFromDb(listingId, input, db, {
      moderationData: {
        moderationStatus: $Enums.ModerationStatus.APPROVED,
        moderationNote: null,
        pendingChanges: Prisma.DbNull,
        moderatedAt: new Date(),
        ...(actorUserId ? { moderatedBy: { connect: { id: actorUserId } } } : {}),
      },
    });
    return listing ? { kind: 'applied', listing } : { kind: 'not-found' };
  }

  const changed = significantChanges(toSnapshot(row), input);

  // Nothing public to protect: the listing is awaiting first review, or was
  // rejected and is being resubmitted. Apply the whole payload and put it (back)
  // in the queue — REJECTED flips to PENDING on resubmit.
  if (row.moderationStatus !== $Enums.ModerationStatus.APPROVED) {
    const listing = await updateListingFromDb(listingId, input, db, {
      moderationData: {
        moderationStatus: $Enums.ModerationStatus.PENDING,
        pendingChanges: Prisma.DbNull,
      },
    });
    return listing ? { kind: 'applied', listing } : { kind: 'not-found' };
  }

  if (changed.length === 0) {
    const listing = await updateListingFromDb(listingId, input, db);
    return listing ? { kind: 'applied', listing } : { kind: 'not-found' };
  }

  // Approved and publicly visible: park the significant fields, apply the rest.
  const listing = await updateListingFromDb(listingId, input, db, {
    omitFields: changed,
    moderationData: {
      pendingChanges: pickPendingChanges(input, changed) as Prisma.InputJsonValue,
    },
  });
  return listing ? { kind: 'queued', listing, fields: changed } : { kind: 'not-found' };
}
