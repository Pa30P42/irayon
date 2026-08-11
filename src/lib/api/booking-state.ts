import type { $Enums } from '@prisma/client';

/**
 * The booking state machine, as one table.
 *
 * Every transition in the system goes through `canTransition`. Keeping the
 * rules here rather than scattered across five route handlers is what makes
 * "can a host cancel an accepted booking?" a question with one answer instead
 * of five subtly different ones.
 */

export type BookingStatusValue = $Enums.BookingStatus;

/**
 * Who is asking. `system` is the hourly cron — it is the only actor that may
 * expire or complete a booking, and it may never accept or decline one on a
 * host's behalf.
 */
export type BookingActor = 'guest' | 'host' | 'system';

type Transition = {
  from: BookingStatusValue;
  to: BookingStatusValue;
  actors: readonly BookingActor[];
};

const TRANSITIONS: readonly Transition[] = [
  // The host's decision on a request.
  { from: 'PENDING', to: 'ACCEPTED', actors: ['host'] },
  { from: 'PENDING', to: 'DECLINED', actors: ['host'] },

  // A guest may withdraw a request that hasn't been answered yet.
  { from: 'PENDING', to: 'CANCELLED', actors: ['guest'] },

  // Nobody answered in time. Cron only — a host "expiring" a request by hand
  // is a decline, and should be recorded as one.
  { from: 'PENDING', to: 'EXPIRED', actors: ['system'] },

  // Either side can back out of a confirmed booking before check-in. The
  // handler enforces the check-in deadline; this table only says who is
  // allowed to ask. `cancelledBy` records which one it was.
  { from: 'ACCEPTED', to: 'CANCELLED', actors: ['guest', 'host'] },

  // The stay happened. Cron only, after check-out.
  { from: 'ACCEPTED', to: 'COMPLETED', actors: ['system'] },
];

/**
 * Terminal states. Reaching one ends the booking's life — there is no
 * "un-decline" and no "un-cancel", because either would resurrect dates that
 * the exclusion constraint has already let somebody else take.
 */
export const TERMINAL_STATUSES: readonly BookingStatusValue[] = [
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
  'COMPLETED',
];

export const isTerminal = (status: BookingStatusValue): boolean =>
  TERMINAL_STATUSES.includes(status);

/** Only an ACCEPTED booking holds dates against other guests. */
export const holdsDates = (status: BookingStatusValue): boolean => status === 'ACCEPTED';

export function canTransition(
  from: BookingStatusValue,
  to: BookingStatusValue,
  actor: BookingActor,
): boolean {
  return TRANSITIONS.some(
    (t) => t.from === from && t.to === to && (t.actors as readonly string[]).includes(actor),
  );
}

/** Everything `actor` could legally do to a booking in `status`. Drives the UI. */
export function allowedTransitions(
  from: BookingStatusValue,
  actor: BookingActor,
): BookingStatusValue[] {
  return TRANSITIONS.filter(
    (t) => t.from === from && (t.actors as readonly string[]).includes(actor),
  ).map((t) => t.to);
}
