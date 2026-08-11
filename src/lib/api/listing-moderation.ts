import type { CreateListingInput } from './listings-create-validator';

/**
 * Moderation rules, as pure functions.
 *
 * Two decisions live here and nowhere else:
 *
 *   1. which host edits are *significant* enough to need review before they
 *      reach the public site (`isSignificantEdit`), and
 *   2. what state a photo should be in after a write (`nextImageState` /
 *      `markImageForRemoval`).
 *
 * Both take an explicit `actor`. **Moderation gates untrusted input only** — an
 * admin is not untrusted input, and after the B1 backfill the admin is the host
 * of every legacy listing, so an admin editing through their own cabinet would
 * otherwise queue changes for their own approval.
 */

export type ModerationActor = 'host' | 'admin';

export type ModerationStatusValue = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ImageStateValue = 'LIVE' | 'PENDING_ADD' | 'PENDING_REMOVE';

/**
 * Fields whose change requires review before the public site shows it.
 *
 * `phone` is on this list and that is not an oversight. With offline
 * settlement the phone number IS the conversion funnel and the payment
 * channel: pass moderation with a clean listing, then swap the number, is the
 * highest-value abuse path in the entire system.
 *
 * `status` is deliberately NOT here — a host must always be able to unpublish
 * instantly, without waiting for a human. Neither are `price`, `capacity`,
 * `bedrooms`, `amenities`, `meals`, `activities`: they're routine operational
 * edits, and queueing them would make the review queue useless through sheer
 * volume.
 */
export const SIGNIFICANT_FIELDS = [
  'title',
  'description',
  'address',
  'lat',
  'lng',
  'placeType',
  'region',
  'villageId',
  'phone',
] as const;

export type SignificantField = (typeof SIGNIFICANT_FIELDS)[number];

/**
 * Coordinate comparison precision: 6 decimal places ≈ 11 cm.
 *
 * **Never compare `lat`/`lng` with raw `!==`.** The columns are `Float`; a
 * value that has round-tripped through JSON, the map widget, or Prisma comes
 * back as `41.12345670000001`. Raw inequality is then `true` on *every* edit,
 * the entire live-apply path silently stops working, and a host who changed
 * only the price finds it queued for review — a failure that reads exactly
 * like intended behaviour.
 *
 * There is deliberately no distance THRESHOLD. A threshold measured against
 * the current live value is an accumulator: ten sub-threshold edits walk the
 * pin a kilometre down the road without ever tripping review.
 */
const COORD_PRECISION = 6;

/** Apply on write as well as on compare, so stored and compared values agree. */
export const normalizeCoordinate = (value: number): number =>
  Number(value.toFixed(COORD_PRECISION));

const sameCoordinate = (a: number, b: number): boolean =>
  normalizeCoordinate(a) === normalizeCoordinate(b);

type LocalizedText = { az: string; ru: string; en: string };

const sameLocalized = (a: LocalizedText, b: LocalizedText): boolean =>
  a.az === b.az && a.ru === b.ru && a.en === b.en;

/** Current listing values, as read from the database. */
export type ListingModerationSnapshot = {
  title: LocalizedText;
  description: LocalizedText;
  address: string;
  lat: number;
  lng: number;
  /** DTO form, e.g. `villa-cottage`. */
  placeType: string;
  /** Region slug. */
  region: string;
  villageId: string | null;
  phone: string | null;
};

/**
 * Which significant fields the payload actually changes. Empty array means the
 * edit can apply live.
 *
 * The stored title/description are normalised the same way the write path
 * normalises them (empty locale falls back to English), or every save of an
 * unchanged form would report a difference.
 */
export function significantChanges(
  current: ListingModerationSnapshot,
  input: CreateListingInput,
): SignificantField[] {
  const changed: SignificantField[] = [];

  const inputTitle: LocalizedText = {
    az: input.title.az || input.title.en,
    ru: input.title.ru || input.title.en,
    en: input.title.en,
  };
  const inputDescription: LocalizedText = {
    az: input.description.az || input.description.en,
    ru: input.description.ru || input.description.en,
    en: input.description.en,
  };

  if (!sameLocalized(current.title, inputTitle)) changed.push('title');
  if (!sameLocalized(current.description, inputDescription)) changed.push('description');
  if (current.address !== input.address) changed.push('address');
  if (!sameCoordinate(current.lat, input.lat)) changed.push('lat');
  if (!sameCoordinate(current.lng, input.lng)) changed.push('lng');
  if (current.placeType !== input.placeType) changed.push('placeType');
  if (current.region !== input.region) changed.push('region');
  if ((current.villageId ?? null) !== (input.villageId ?? null)) changed.push('villageId');
  if ((current.phone ?? '') !== (input.phone ?? '')) changed.push('phone');

  return changed;
}

/**
 * Host path only. On the admin path this is never consulted: an admin's edit
 * applies live whatever it touches.
 */
export function isSignificantEdit(
  current: ListingModerationSnapshot,
  input: CreateListingInput,
): boolean {
  return significantChanges(current, input).length > 0;
}

/** The significant subset of a payload, for storing in `pendingChanges`. */
export function pickPendingChanges(
  input: CreateListingInput,
  fields: SignificantField[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    switch (field) {
      case 'lat':
        out.lat = normalizeCoordinate(input.lat);
        break;
      case 'lng':
        out.lng = normalizeCoordinate(input.lng);
        break;
      default:
        out[field] = input[field];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Photo state
// ---------------------------------------------------------------------------

/**
 * The state a NEWLY UPLOADED image should carry.
 *
 * Photo state is always DERIVED, never written literally — one choke point, in
 * the spirit of `publicListingWhere`. Neither enum default is correct in both
 * contexts: `LIVE` is right for a photo on a listing that isn't public yet, and
 * wrong for one on a listing that is.
 */
export function nextImageState(
  listing: { moderationStatus: ModerationStatusValue },
  actor: ModerationActor,
): ImageStateValue {
  if (actor === 'admin') return 'LIVE';
  return listing.moderationStatus === 'APPROVED' ? 'PENDING_ADD' : 'LIVE';
}

export type ImageRemoval =
  /** Drop the row (and its stored blob) immediately. */
  | { kind: 'delete' }
  /** Keep it publicly visible until a moderator confirms the removal. */
  | { kind: 'mark'; state: 'PENDING_REMOVE' };

/**
 * What a delete request should actually do.
 *
 * A host removing a photo from an already-approved listing doesn't get to
 * change the live listing unilaterally — the row is flagged and stays visible
 * until review. Anywhere else (not yet public, or an admin acting) the row goes
 * immediately, and the existing storage-cleanup path removes the blob.
 */
export function markImageForRemoval(
  listing: { moderationStatus: ModerationStatusValue },
  actor: ModerationActor,
): ImageRemoval {
  if (actor === 'admin') return { kind: 'delete' };
  return listing.moderationStatus === 'APPROVED'
    ? { kind: 'mark', state: 'PENDING_REMOVE' }
    : { kind: 'delete' };
}

/**
 * Image states a PUBLIC surface may render.
 *
 * `PENDING_ADD` is invisible — it hasn't been reviewed. `PENDING_REMOVE` stays
 * visible — it's approved content whose removal hasn't been reviewed yet, and
 * hiding it early would let a host empty a live listing without review.
 */
export const PUBLIC_IMAGE_STATES = ['LIVE', 'PENDING_REMOVE'] as const;

/** States that survive an approval, i.e. the resulting live photo set. */
export const stateAfterApproval = (state: ImageStateValue): ImageStateValue | null => {
  switch (state) {
    case 'PENDING_ADD':
      return 'LIVE';
    case 'PENDING_REMOVE':
      return null; // row is deleted
    case 'LIVE':
      return 'LIVE';
  }
};

/** States that survive a rejection. */
export const stateAfterRejection = (state: ImageStateValue): ImageStateValue | null => {
  switch (state) {
    case 'PENDING_ADD':
      return null; // never approved — delete the row and its blob
    case 'PENDING_REMOVE':
      return 'LIVE'; // removal refused; put it back
    case 'LIVE':
      return 'LIVE';
  }
};
