import { describe, expect, it } from 'vitest';
import {
  isSignificantEdit,
  markImageForRemoval,
  nextImageState,
  normalizeCoordinate,
  pickPendingChanges,
  significantChanges,
  stateAfterApproval,
  stateAfterRejection,
  type ListingModerationSnapshot,
} from './listing-moderation';
import type { CreateListingInput } from './listings-create-validator';

const CURRENT: ListingModerationSnapshot = {
  title: { az: 'Ev', ru: 'Дом', en: 'House' },
  description: { az: 'Təsvir', ru: 'Описание', en: 'Description' },
  address: 'Laza, Qusar',
  lat: 41.1234567,
  lng: 47.7654321,
  placeType: 'villa-cottage',
  region: 'qusar',
  villageId: 'vil_1',
  phone: '+994501234567',
};

const INPUT: CreateListingInput = {
  title: { az: 'Ev', ru: 'Дом', en: 'House' },
  description: { az: 'Təsvir', ru: 'Описание', en: 'Description' },
  region: 'qusar',
  villageId: 'vil_1',
  placeType: 'villa-cottage',
  categories: ['mountain'],
  status: 'published',
  price: 150,
  cleaningFee: 20,
  capacity: 6,
  bedrooms: 3,
  lat: 41.1234567,
  lng: 47.7654321,
  address: 'Laza, Qusar',
  phone: '+994501234567',
  amenities: ['wifi'],
  meals: [],
  activities: [],
};

const withInput = (overrides: Partial<CreateListingInput>): CreateListingInput => ({
  ...INPUT,
  ...overrides,
});

describe('significantChanges', () => {
  it('reports nothing for an unchanged payload', () => {
    expect(significantChanges(CURRENT, INPUT)).toEqual([]);
    expect(isSignificantEdit(CURRENT, INPUT)).toBe(false);
  });

  it.each([
    ['title', { title: { az: 'Ev', ru: 'Дом', en: 'Cabin' } }],
    ['description', { description: { az: 'Yeni', ru: 'Новое', en: 'New' } }],
    ['address', { address: 'Somewhere else' }],
    ['placeType', { placeType: 'a-frame' }],
    ['region', { region: 'qabala' }],
    ['villageId', { villageId: 'vil_2' }],
  ])('treats a changed %s as significant', (field, override) => {
    expect(significantChanges(CURRENT, withInput(override as Partial<CreateListingInput>))).toEqual(
      [field],
    );
  });

  it('treats a changed phone as significant', () => {
    // With offline settlement the phone number is the payment channel: pass
    // moderation clean, then swap the number, is the highest-value abuse path
    // in the system.
    expect(significantChanges(CURRENT, withInput({ phone: '+994559999999' }))).toEqual(['phone']);
  });

  it.each([
    ['price', { price: 999 }],
    ['cleaningFee', { cleaningFee: 45 }],
    ['capacity', { capacity: 12 }],
    ['bedrooms', { bedrooms: 5 }],
    ['amenities', { amenities: ['wifi', 'parking'] }],
    ['meals', { meals: ['breakfast'] }],
    ['activities', { activities: ['fishing'] }],
    // A host must always be able to unpublish instantly, without waiting for
    // a human to approve it.
    ['status', { status: 'draft' }],
  ])('applies a changed %s live', (_field, override) => {
    expect(isSignificantEdit(CURRENT, withInput(override as Partial<CreateListingInput>))).toBe(
      false,
    );
  });

  /**
   * The single most important test in this file. `lat`/`lng` are `Float`
   * columns: a value round-tripped through JSON, the map widget, or Prisma
   * comes back with trailing float noise. Comparing with raw `!==` makes EVERY
   * edit significant, silently killing the whole live-apply path — and the
   * failure looks exactly like intended behaviour.
   */
  it('ignores float noise in coordinates', () => {
    const noisy = withInput({ lat: 41.12345670000001, lng: 47.765432099999995 });
    expect(significantChanges(CURRENT, noisy)).toEqual([]);
  });

  it('still catches a real relocation, however small', () => {
    // No distance threshold: a threshold measured against the current live
    // value is an accumulator — ten sub-threshold edits walk the pin a
    // kilometre away without ever tripping review.
    expect(significantChanges(CURRENT, withInput({ lat: 41.1235 }))).toEqual(['lat']);
  });

  it('normalises coordinates to the same precision it compares at', () => {
    expect(normalizeCoordinate(41.12345670000001)).toBe(41.123457);
    expect(normalizeCoordinate(41.1234564999)).toBe(41.123456);
  });

  it('falls back to English for empty locales, matching the write path', () => {
    // The write path stores `az || en`; without the same normalisation here,
    // saving an untouched form would report a phantom change.
    const currentWithFallback: ListingModerationSnapshot = {
      ...CURRENT,
      title: { az: 'House', ru: 'House', en: 'House' },
    };
    const input = withInput({ title: { az: '', ru: '', en: 'House' } });
    expect(significantChanges(currentWithFallback, input)).toEqual([]);
  });

  it('reports several changed fields at once', () => {
    const changed = significantChanges(
      CURRENT,
      withInput({ address: 'New address', phone: '+994700000000', price: 500 }),
    );
    expect(changed.sort()).toEqual(['address', 'phone']);
  });
});

describe('pickPendingChanges', () => {
  it('stores only the significant subset, with normalised coordinates', () => {
    const input = withInput({ lat: 41.55555550000001, price: 999 });
    const changes = pickPendingChanges(input, significantChanges(CURRENT, input));
    expect(changes).toEqual({ lat: 41.555556 });
    // Live-apply fields must never leak into the pending blob — merging on
    // approval would then resurrect a stale price.
    expect(changes).not.toHaveProperty('price');
  });
});

describe('nextImageState', () => {
  it('hides a host upload on an already-approved listing', () => {
    expect(nextImageState({ moderationStatus: 'APPROVED' }, 'host')).toBe('PENDING_ADD');
  });

  it('lets a host upload go live on a listing that is not public yet', () => {
    // Nothing is publicly visible, so there is nothing to protect — and the
    // whole set is reviewed together when the listing is approved.
    expect(nextImageState({ moderationStatus: 'PENDING' }, 'host')).toBe('LIVE');
    expect(nextImageState({ moderationStatus: 'REJECTED' }, 'host')).toBe('LIVE');
  });

  it('is unconditionally LIVE for an admin, in both lifecycles', () => {
    expect(nextImageState({ moderationStatus: 'APPROVED' }, 'admin')).toBe('LIVE');
    expect(nextImageState({ moderationStatus: 'PENDING' }, 'admin')).toBe('LIVE');
  });
});

describe('markImageForRemoval', () => {
  it('keeps an approved listing intact until review', () => {
    expect(markImageForRemoval({ moderationStatus: 'APPROVED' }, 'host')).toEqual({
      kind: 'mark',
      state: 'PENDING_REMOVE',
    });
  });

  it('deletes outright when nothing is public yet', () => {
    expect(markImageForRemoval({ moderationStatus: 'PENDING' }, 'host')).toEqual({
      kind: 'delete',
    });
  });

  it('deletes outright for an admin', () => {
    expect(markImageForRemoval({ moderationStatus: 'APPROVED' }, 'admin')).toEqual({
      kind: 'delete',
    });
  });
});

describe('approval / rejection transitions', () => {
  it('approve: PENDING_ADD becomes live, PENDING_REMOVE is dropped', () => {
    expect(stateAfterApproval('PENDING_ADD')).toBe('LIVE');
    expect(stateAfterApproval('PENDING_REMOVE')).toBeNull();
    expect(stateAfterApproval('LIVE')).toBe('LIVE');
  });

  it('reject: PENDING_ADD is dropped, PENDING_REMOVE is restored', () => {
    expect(stateAfterRejection('PENDING_ADD')).toBeNull();
    expect(stateAfterRejection('PENDING_REMOVE')).toBe('LIVE');
    expect(stateAfterRejection('LIVE')).toBe('LIVE');
  });
});
