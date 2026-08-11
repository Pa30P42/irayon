import { describe, expect, it } from 'vitest';
import {
  allowedTransitions,
  canTransition,
  holdsDates,
  isTerminal,
  type BookingActor,
  type BookingStatusValue,
} from './booking-state';

const ALL_STATUSES: BookingStatusValue[] = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
  'COMPLETED',
];
const ALL_ACTORS: BookingActor[] = ['guest', 'host', 'system'];

/** Every transition that IS allowed. Anything absent must be refused. */
const ALLOWED: [BookingStatusValue, BookingStatusValue, BookingActor][] = [
  ['PENDING', 'ACCEPTED', 'host'],
  ['PENDING', 'DECLINED', 'host'],
  ['PENDING', 'CANCELLED', 'guest'],
  ['PENDING', 'EXPIRED', 'system'],
  ['ACCEPTED', 'CANCELLED', 'guest'],
  ['ACCEPTED', 'CANCELLED', 'host'],
  ['ACCEPTED', 'COMPLETED', 'system'],
];

describe('canTransition — the full matrix', () => {
  it.each(ALLOWED)('allows %s → %s by %s', (from, to, actor) => {
    expect(canTransition(from, to, actor)).toBe(true);
  });

  /**
   * Exhaustive complement: 6 statuses × 6 statuses × 3 actors, minus the seven
   * above, must ALL be refused. Enumerating the negative space is the only way
   * to catch a transition someone adds later without thinking about who is
   * allowed to make it.
   */
  it('refuses every combination not on the allow-list', () => {
    const allowedKeys = new Set(ALLOWED.map(([f, t, a]) => `${f}>${t}:${a}`));
    const wrongly: string[] = [];

    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        for (const actor of ALL_ACTORS) {
          const key = `${from}>${to}:${actor}`;
          if (allowedKeys.has(key)) continue;
          if (canTransition(from, to, actor)) wrongly.push(key);
        }
      }
    }

    expect(wrongly).toEqual([]);
  });
});

describe('actor separation', () => {
  it('never lets a guest accept or decline their own request', () => {
    expect(canTransition('PENDING', 'ACCEPTED', 'guest')).toBe(false);
    expect(canTransition('PENDING', 'DECLINED', 'guest')).toBe(false);
  });

  it('never lets the cron decide on a host’s behalf', () => {
    // Expiry is the cron's job; accepting is emphatically not.
    expect(canTransition('PENDING', 'ACCEPTED', 'system')).toBe(false);
    expect(canTransition('PENDING', 'DECLINED', 'system')).toBe(false);
    expect(canTransition('PENDING', 'EXPIRED', 'system')).toBe(true);
  });

  it('never lets a human expire or complete a booking by hand', () => {
    for (const actor of ['guest', 'host'] as const) {
      expect(canTransition('PENDING', 'EXPIRED', actor)).toBe(false);
      expect(canTransition('ACCEPTED', 'COMPLETED', actor)).toBe(false);
    }
  });

  it('lets either party cancel a confirmed booking', () => {
    expect(canTransition('ACCEPTED', 'CANCELLED', 'guest')).toBe(true);
    expect(canTransition('ACCEPTED', 'CANCELLED', 'host')).toBe(true);
  });
});

describe('terminal states', () => {
  it.each(['DECLINED', 'EXPIRED', 'CANCELLED', 'COMPLETED'] as BookingStatusValue[])(
    '%s is terminal and cannot be left by anyone',
    (status) => {
      expect(isTerminal(status)).toBe(true);
      for (const to of ALL_STATUSES) {
        for (const actor of ALL_ACTORS) {
          // Resurrecting a terminal booking would re-take dates the exclusion
          // constraint has already let somebody else have.
          expect(canTransition(status, to, actor)).toBe(false);
        }
      }
    },
  );

  it('treats PENDING and ACCEPTED as live', () => {
    expect(isTerminal('PENDING')).toBe(false);
    expect(isTerminal('ACCEPTED')).toBe(false);
  });
});

describe('holdsDates', () => {
  it('is true only for ACCEPTED', () => {
    // This is what the exclusion constraint's WHERE clause encodes: any number
    // of pending requests may overlap, only an acceptance takes the dates.
    for (const status of ALL_STATUSES) {
      expect(holdsDates(status)).toBe(status === 'ACCEPTED');
    }
  });
});

describe('allowedTransitions', () => {
  it('drives the host inbox buttons', () => {
    expect(allowedTransitions('PENDING', 'host').sort()).toEqual(['ACCEPTED', 'DECLINED']);
    expect(allowedTransitions('ACCEPTED', 'host')).toEqual(['CANCELLED']);
  });

  it('drives the guest booking list', () => {
    expect(allowedTransitions('PENDING', 'guest')).toEqual(['CANCELLED']);
    expect(allowedTransitions('ACCEPTED', 'guest')).toEqual(['CANCELLED']);
    expect(allowedTransitions('COMPLETED', 'guest')).toEqual([]);
  });
});
