import { toDateOnly, todayInBakuDateOnly } from '@/lib/dates-baku';
import { z } from 'zod';

/**
 * Booking request payload.
 *
 * Note what is NOT here: any price. The guest sends dates, a guest count, and
 * an optional note; the server re-derives `pricePerNight`, `cleaningFee`,
 * `nights`, and `total` from the listing row. A client-supplied total is not
 * something to validate, it is something to ignore — so it has no field at all.
 */

/** Longest stay a single request may cover. */
export const MAX_BOOKING_NIGHTS = 30;

/**
 * `YYYY-MM-DD`, parsed as a calendar date with no zone.
 *
 * Deliberately not `z.coerce.date()`: that accepts full ISO timestamps and
 * anything else `new Date()` will swallow, so `2026-08-11T23:00:00+05:00` would
 * land on a different day than the guest picked. A booking is a calendar
 * concept; only a calendar string is accepted.
 */
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .transform((value, ctx) => {
    const [year, month, day] = value.split('-').map(Number) as [number, number, number];
    const date = toDateOnly({ year, month, day });
    // Round-trip check: `2026-02-31` parses arithmetically into 3 March, which
    // is not the date anybody asked for.
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Not a real calendar date' });
      return z.NEVER;
    }
    return date;
  });

export const createBookingSchema = z
  .object({
    listingId: z.string().trim().min(1).max(64),
    checkIn: calendarDate,
    checkOut: calendarDate,
    guestCount: z.coerce.number().int().positive().max(50),
    guestNote: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.checkOut.getTime() <= value.checkIn.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checkOut'],
        message: 'Check-out must be after check-in',
      });
      return;
    }

    const nights = Math.round((value.checkOut.getTime() - value.checkIn.getTime()) / 86_400_000);
    if (nights > MAX_BOOKING_NIGHTS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checkOut'],
        message: `A single request can cover at most ${MAX_BOOKING_NIGHTS} nights`,
      });
    }

    // "Today" means today IN BAKU, not in UTC and not on the server's clock.
    // Between 20:00 and 24:00 UTC those disagree, and a guest in Azerbaijan
    // booking tonight for tomorrow would otherwise be told the date is past.
    if (value.checkIn.getTime() < todayInBakuDateOnly().getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checkIn'],
        message: 'Check-in cannot be in the past',
      });
    }
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/** Host decline. A reason is optional here — unlike a moderation rejection,
 *  which the host must act on, a decline is often simply "those dates suit me
 *  badly" and forcing prose would just produce noise. */
export const declineBookingSchema = z
  .object({ reason: z.string().trim().max(500).optional() })
  .strict();

export const cancelBookingSchema = z
  .object({ reason: z.string().trim().max(500).optional() })
  .strict();

/** Host availability block. */
export const createBlockSchema = z
  .object({
    startDate: calendarDate,
    endDate: calendarDate,
    note: z.string().trim().max(200).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.endDate.getTime() <= value.startDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      });
    }
  });

export type CreateBlockInput = z.infer<typeof createBlockSchema>;

/** `GET /api/listings/[slug]/availability?from&to`. */
export const availabilityQuerySchema = z
  .object({ from: calendarDate.optional(), to: calendarDate.optional() })
  .strict();
