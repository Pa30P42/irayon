import { beforeEach, describe, expect, it, vi } from 'vitest';

const findUnique = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: { listing: { findUnique: (...a: unknown[]) => findUnique(...a) } },
}));

const updateListingFromDb = vi.fn();
vi.mock('./listings-service-db', () => ({
  updateListingFromDb: (...a: unknown[]) => updateListingFromDb(...a),
}));

import { updateListingAsActor } from './listing-write-service';
import type { CreateListingInput } from './listings-create-validator';

const CURRENT_ROW = {
  id: 'lst1',
  title: { az: 'Ev', ru: 'Дом', en: 'House' },
  description: { az: 'A', ru: 'B', en: 'C' },
  address: 'Laza',
  lat: 41.1234567,
  lng: 47.7654321,
  placeType: 'VILLA_COTTAGE',
  villageId: null,
  phone: '+994501234567',
  moderationStatus: 'APPROVED' as const,
  region: { slug: 'gusar' },
};

const INPUT: CreateListingInput = {
  title: { az: 'Ev', ru: 'Дом', en: 'House' },
  description: { az: 'A', ru: 'B', en: 'C' },
  region: 'gusar',
  villageId: null,
  placeType: 'villa-cottage',
  categories: ['mountain'],
  status: 'published',
  price: 150,
  capacity: 4,
  bedrooms: 2,
  lat: 41.1234567,
  lng: 47.7654321,
  address: 'Laza',
  phone: '+994501234567',
  amenities: [],
  meals: [],
  activities: [],
};

const withInput = (o: Partial<CreateListingInput>): CreateListingInput => ({ ...INPUT, ...o });

const lastUpdateOptions = () => updateListingFromDb.mock.calls.at(-1)?.[3] ?? {};

beforeEach(() => {
  findUnique.mockReset();
  updateListingFromDb.mockReset();
  findUnique.mockResolvedValue(CURRENT_ROW);
  updateListingFromDb.mockResolvedValue({ id: 'lst1', slug: 'house' });
});

describe('updateListingAsActor — host', () => {
  it('queues a significant edit and leaves the live field untouched', async () => {
    const result = await updateListingAsActor({
      listingId: 'lst1',
      input: withInput({ phone: '+994559999999' }),
      actor: 'host',
    });

    expect(result.kind).toBe('queued');
    if (result.kind === 'queued') expect(result.fields).toEqual(['phone']);

    const options = lastUpdateOptions();
    // The changed field is OMITTED from the live write — the approved listing
    // keeps showing the old phone until a moderator says otherwise.
    expect(options.omitFields).toEqual(['phone']);
    expect(options.moderationData.pendingChanges).toEqual({ phone: '+994559999999' });
  });

  it('applies a non-significant edit live, with no pendingChanges', async () => {
    const result = await updateListingAsActor({
      listingId: 'lst1',
      input: withInput({ price: 999 }),
      actor: 'host',
    });

    expect(result.kind).toBe('applied');
    expect(lastUpdateOptions()).toEqual({});
  });

  it('does not queue on float noise in coordinates', async () => {
    const result = await updateListingAsActor({
      listingId: 'lst1',
      input: withInput({ price: 999, lat: 41.12345670000001 }),
      actor: 'host',
    });
    // If this ever fails, every host edit silently starts queueing for review.
    expect(result.kind).toBe('applied');
  });

  it('applies everything live while the listing is not public yet', async () => {
    findUnique.mockResolvedValue({ ...CURRENT_ROW, moderationStatus: 'PENDING' });
    const result = await updateListingAsActor({
      listingId: 'lst1',
      input: withInput({ phone: '+994559999999', address: 'Elsewhere' }),
      actor: 'host',
    });

    // Nothing is publicly visible, so there is nothing to protect — and the
    // whole listing is reviewed together when it is approved.
    expect(result.kind).toBe('applied');
    expect(lastUpdateOptions().omitFields).toBeUndefined();
    expect(lastUpdateOptions().moderationData.moderationStatus).toBe('PENDING');
  });

  it('flips a REJECTED listing back to PENDING on resubmit', async () => {
    findUnique.mockResolvedValue({ ...CURRENT_ROW, moderationStatus: 'REJECTED' });
    await updateListingAsActor({
      listingId: 'lst1',
      input: withInput({ address: 'Fixed address' }),
      actor: 'host',
    });
    expect(lastUpdateOptions().moderationData.moderationStatus).toBe('PENDING');
  });
});

describe('updateListingAsActor — admin parity', () => {
  it('applies the SAME edit live and never populates pendingChanges', async () => {
    const result = await updateListingAsActor({
      listingId: 'lst1',
      input: withInput({ phone: '+994559999999', address: 'Elsewhere' }),
      actor: 'admin',
      actorUserId: 'admin_1',
    });

    expect(result.kind).toBe('applied');
    const options = lastUpdateOptions();
    // Moderation gates untrusted input, and an admin is not untrusted input.
    // After the B1 backfill the admin hosts every legacy listing, so queueing
    // here would mean queueing edits for their own approval.
    expect(options.omitFields).toBeUndefined();
    expect(options.moderationData.moderationStatus).toBe('APPROVED');
    expect(options.moderationData.pendingChanges).toEqual(expect.anything()); // DbNull sentinel
    expect(options.moderationData.moderatedBy).toEqual({ connect: { id: 'admin_1' } });
  });

  it('promotes a queued PENDING listing that an admin edits directly', async () => {
    findUnique.mockResolvedValue({ ...CURRENT_ROW, moderationStatus: 'PENDING' });
    await updateListingAsActor({ listingId: 'lst1', input: INPUT, actor: 'admin' });
    // An admin editing it IS a review.
    expect(lastUpdateOptions().moderationData.moderationStatus).toBe('APPROVED');
  });

  it('omits the moderator FK for a break-glass session (no user row exists)', async () => {
    await updateListingAsActor({
      listingId: 'lst1',
      input: INPUT,
      actor: 'admin',
      actorUserId: null,
    });
    expect(lastUpdateOptions().moderationData.moderatedBy).toBeUndefined();
  });
});

describe('updateListingAsActor — missing listing', () => {
  it('reports not-found without attempting a write', async () => {
    findUnique.mockResolvedValue(null);
    const result = await updateListingAsActor({ listingId: 'nope', input: INPUT, actor: 'host' });
    expect(result.kind).toBe('not-found');
    expect(updateListingFromDb).not.toHaveBeenCalled();
  });
});
