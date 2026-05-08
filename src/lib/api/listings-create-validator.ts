import { ACTIVITIES, AMENITIES, CATEGORIES, MEALS, PLACE_TYPES } from '@/lib/constants';
import { z } from 'zod';
import { localizedTextSchema } from './localized-text';

const localizedDescription = z.object({
  az: z.string().trim().max(4000).optional().default(''),
  ru: z.string().trim().max(4000).optional().default(''),
  en: z.string().trim().min(1, 'English description is required').max(4000),
});

export const createListingSchema = z.object({
  title: localizedTextSchema,
  description: localizedDescription,
  /** Region slug. Validated against DB at the route handler. */
  region: z.string().trim().min(1, 'Region is required'),
  /** Optional FK to the listing's village. Null when no curated village fits. */
  villageId: z.string().nullable().optional().default(null),
  placeType: z.enum(PLACE_TYPES as readonly [string, ...string[]]),
  category: z.enum(CATEGORIES as readonly [string, ...string[]]),
  price: z.coerce.number().int().positive().max(100_000),
  capacity: z.coerce.number().int().positive().max(50),
  bedrooms: z.coerce.number().int().nonnegative().max(20),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  address: z.string().trim().min(1).max(300),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{6,20}$/, 'Phone must be 6–20 digits, optional +/spaces/dashes/parens'),
  amenities: z.array(z.enum(AMENITIES as readonly [string, ...string[]])).default([]),
  meals: z.array(z.enum(MEALS as readonly [string, ...string[]])).default([]),
  activities: z.array(z.enum(ACTIVITIES as readonly [string, ...string[]])).default([]),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
