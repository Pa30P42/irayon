import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { moderateListing, moderationQueueWhere } from './moderation-service';

/**
 * A hand-rolled Prisma double rather than `DeepMockProxy`: these cases assert
 * the SHAPE of a `$transaction` array (which updates, which deletes, in which
 * order), and recording the calls directly is far clearer than unpicking a
 * proxy afterwards.
 */
function mkDb(overrides: { listing?: unknown } = {}) {
  const calls: { op: string; args: unknown }[] = [];
  const record = (op: string) => (args: unknown) => {
    calls.push({ op, args });
    return { __op: op, ...(args as object) };
  };

  const db = {
    listing: {
      findUnique: vi.fn().mockResolvedValue(overrides.listing ?? null),
      update: record('listing.update'),
    },
    image: {
      deleteMany: record('image.deleteMany'),
      updateMany: record('image.updateMany'),
      update: record('image.update'),
    },
    region: { findUnique: vi.fn().mockResolvedValue({ id: 'reg_new' }) },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  return { db: db as unknown as PrismaClient, calls };
}

const img = (id: string, state: string, order: number) => ({
  id,
  url: `https://cdn.example/${id}.webp`,
  moderationState: state,
  order,
});

const LISTING = {
  id: 'lst1',
  slug: 'cabin',
  title: { az: 'Ev', ru: 'Дом', en: 'Cabin' },
  description: { az: 'A', ru: 'B', en: 'C' },
  address: 'Laza',
  moderationStatus: 'PENDING',
  pendingChanges: null,
  images: [img('i1', 'LIVE', 0)],
  host: { email: 'host@example.com', name: 'Host', preferredLocale: 'ru' },
};

const listingUpdateData = (calls: { op: string; args: unknown }[]) =>
  (calls.find((c) => c.op === 'listing.update')?.args as { data: Record<string, unknown> }).data;

beforeEach(() => vi.clearAllMocks());

describe('approve', () => {
  it('publishes a new listing and stamps the moderator', async () => {
    const { db, calls } = mkDb({ listing: LISTING });
    const result = await moderateListing({
      listingId: 'lst1',
      decision: 'approve',
      moderatorUserId: 'admin_1',
      db,
    });

    expect(result.kind).toBe('ok');
    const data = listingUpdateData(calls);
    expect(data.moderationStatus).toBe('APPROVED');
    expect(data.moderationNote).toBeNull();
    expect(data.moderatedBy).toEqual({ connect: { id: 'admin_1' } });
    // Parked edits are consumed either way, or the same review re-queues forever.
    expect(data.pendingChanges).toBeDefined();
  });

  it('merges parked edits and rebuilds the search index from the MERGED values', async () => {
    const { db, calls } = mkDb({
      listing: {
        ...LISTING,
        moderationStatus: 'APPROVED',
        pendingChanges: { address: 'New address', phone: '+994559999999' },
      },
    });
    await moderateListing({ listingId: 'lst1', decision: 'approve', db });

    const data = listingUpdateData(calls);
    expect(data.address).toBe('New address');
    expect(data.phone).toBe('+994559999999');
    // searchText is derived from title + address; merging one without
    // recomputing it leaves the public index describing content that no longer
    // exists.
    expect(data.searchText).toContain('new address');
    expect(data.searchText).toContain('cabin');
  });

  it('promotes PENDING_ADD to live and deletes PENDING_REMOVE rows', async () => {
    const { db, calls } = mkDb({
      listing: {
        ...LISTING,
        moderationStatus: 'APPROVED',
        images: [img('i1', 'LIVE', 0), img('i2', 'PENDING_ADD', 1), img('i3', 'PENDING_REMOVE', 2)],
      },
    });
    const result = await moderateListing({ listingId: 'lst1', decision: 'approve', db });

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    // The removed blob is handed back for cleanup after the response flushes.
    expect(result.removedImageUrls).toEqual(['https://cdn.example/i3.webp']);

    const del = calls.find((c) => c.op === 'image.deleteMany')?.args as {
      where: { id: { in: string[] } };
    };
    expect(del.where.id.in).toEqual(['i3']);

    // Survivors are renumbered 0..n-1 so a deletion can't leave a gap that
    // silently moves the cover photo.
    const orders = calls
      .filter((c) => c.op === 'image.update')
      .map((c) => c.args as { where: { id: string }; data: { order: number } });
    expect(orders.map((o) => [o.where.id, o.data.order])).toEqual([
      ['i1', 0],
      ['i2', 1],
    ]);
  });

  /**
   * The authoritative empty-photo-set guard. A host can mark every photo
   * `PENDING_REMOVE` and add nothing; approving that would put a live listing
   * on the public site with no images, and the create form's minimum-image
   * validation never runs on this path.
   */
  it('refuses an approval that would leave the listing with no photos', async () => {
    const { db, calls } = mkDb({
      listing: {
        ...LISTING,
        moderationStatus: 'APPROVED',
        images: [img('i1', 'PENDING_REMOVE', 0), img('i2', 'PENDING_REMOVE', 1)],
      },
    });
    const result = await moderateListing({ listingId: 'lst1', decision: 'approve', db });

    expect(result).toEqual({ kind: 'would-empty-images', liveCount: 0 });
    // Nothing was written — the check runs before the transaction is built.
    expect(calls).toHaveLength(0);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('still approves when a PENDING_ADD photo replaces the removed ones', async () => {
    const { db } = mkDb({
      listing: {
        ...LISTING,
        moderationStatus: 'APPROVED',
        images: [img('i1', 'PENDING_REMOVE', 0), img('i2', 'PENDING_ADD', 1)],
      },
    });
    const result = await moderateListing({ listingId: 'lst1', decision: 'approve', db });
    expect(result.kind).toBe('ok');
  });
});

describe('reject', () => {
  it('records the reason and marks a first-time listing REJECTED', async () => {
    const { db, calls } = mkDb({ listing: LISTING });
    const result = await moderateListing({
      listingId: 'lst1',
      decision: 'reject',
      reason: 'Photos do not show the actual property.',
      db,
    });

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.keptApproved).toBe(false);
    const data = listingUpdateData(calls);
    expect(data.moderationStatus).toBe('REJECTED');
    expect(data.moderationNote).toBe('Photos do not show the actual property.');
  });

  /**
   * Deliberate asymmetry. Marking a previously-approved listing REJECTED would
   * unpublish content a moderator already accepted, because the host tried to
   * change a phone number — punishing the guest-facing site for a bad edit.
   */
  it('keeps a previously-approved listing LIVE when only its edit is rejected', async () => {
    const { db, calls } = mkDb({
      listing: {
        ...LISTING,
        moderationStatus: 'APPROVED',
        pendingChanges: { phone: '+994559999999' },
      },
    });
    const result = await moderateListing({
      listingId: 'lst1',
      decision: 'reject',
      reason: 'That phone number is not associated with this property.',
      db,
    });

    if (result.kind === 'ok') expect(result.keptApproved).toBe(true);
    const data = listingUpdateData(calls);
    expect(data.moderationStatus).toBe('APPROVED');
    // The parked edit is still discarded — only the listing's status survives.
    expect(data.pendingChanges).toBeDefined();
  });

  it('deletes unreviewed additions and restores photos whose removal was refused', async () => {
    const { db, calls } = mkDb({
      listing: {
        ...LISTING,
        moderationStatus: 'APPROVED',
        images: [img('i1', 'LIVE', 0), img('i2', 'PENDING_ADD', 1), img('i3', 'PENDING_REMOVE', 2)],
      },
    });
    const result = await moderateListing({
      listingId: 'lst1',
      decision: 'reject',
      reason: 'The new photo is of a different building.',
      db,
    });

    if (result.kind === 'ok') {
      // The never-approved addition is destroyed, blob and all.
      expect(result.removedImageUrls).toEqual(['https://cdn.example/i2.webp']);
    }
    const del = calls.find((c) => c.op === 'image.deleteMany')?.args as {
      where: { id: { in: string[] } };
    };
    expect(del.where.id.in).toEqual(['i2']);

    // Everything left becomes LIVE — including i3, whose removal was refused.
    const reset = calls.find((c) => c.op === 'image.updateMany')?.args as {
      data: { moderationState: string };
    };
    expect(reset.data.moderationState).toBe('LIVE');
  });

  it('never merges pendingChanges on the reject path', async () => {
    const { db, calls } = mkDb({
      listing: {
        ...LISTING,
        moderationStatus: 'APPROVED',
        pendingChanges: { address: 'Somewhere else' },
      },
    });
    await moderateListing({ listingId: 'lst1', decision: 'reject', reason: 'Not verifiable.', db });
    expect(listingUpdateData(calls).address).toBeUndefined();
  });
});

describe('not found', () => {
  it('reports not-found without writing', async () => {
    const { db, calls } = mkDb({ listing: null });
    const result = await moderateListing({ listingId: 'nope', decision: 'approve', db });
    expect(result).toEqual({ kind: 'not-found' });
    expect(calls).toHaveLength(0);
  });
});

describe('moderationQueueWhere', () => {
  it('selects new listings AND approved listings carrying unreviewed work', () => {
    const where = moderationQueueWhere();
    expect(where.OR?.[0]).toEqual({ moderationStatus: 'PENDING' });

    const editedBranch = where.OR?.[1] as { OR: unknown[] };
    // Two independent reasons an approved listing is back in the queue: parked
    // scalar edits, or a photo in a non-LIVE state.
    expect(editedBranch.OR).toHaveLength(2);
  });
});
