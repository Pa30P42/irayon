import {
  ACTIVITIES,
  AMENITIES,
  BASIC_AMENITIES,
  CATEGORIES,
  EXTRA_AMENITIES,
  GUEST_RANGES,
  MEALS,
  PLACEMENTS,
  PLACE_TYPES,
  SORT_OPTIONS,
} from '@/lib/constants';
import { z } from 'zod';

/**
 * Coerces a comma-separated string OR repeated query params into a string array.
 * `URLSearchParams.getAll(key)` returns `[]` when absent and `["a,b"]` when joined,
 * so the preprocess accepts both shapes.
 */
const csvArray = (input: unknown): string[] => {
  if (Array.isArray(input)) return input.flatMap((v) => String(v).split(',')).filter(Boolean);
  if (typeof input === 'string') return input.split(',').filter(Boolean);
  return [];
};

const csvEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(csvArray, z.array(z.enum(values as unknown as [string, ...string[]])).default([]));

/** CSV of arbitrary slugs (no enum check — universe is data-driven). */
const csvSlugs = z.preprocess(csvArray, z.array(z.string().min(1)).default([]));

export const listingsQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(''),
  category: z.enum(CATEGORIES as readonly [string, ...string[]]).optional(),
  /** Region slugs (multi). Single-value URLs (?region=gabala) parse fine. */
  region: csvSlugs,
  /** Village slugs (multi). Validated against DB at the service layer. */
  village: csvSlugs,
  type: csvEnum(PLACE_TYPES as readonly [string, ...string[]]),
  guests: z.enum(GUEST_RANGES as readonly [string, ...string[]]).optional(),
  placement: csvEnum(PLACEMENTS as readonly [string, ...string[]]),
  food: csvEnum(MEALS as readonly [string, ...string[]]),
  extra: csvEnum(EXTRA_AMENITIES as readonly [string, ...string[]]),
  basic: csvEnum(BASIC_AMENITIES as readonly [string, ...string[]]),
  amenities: csvEnum(AMENITIES as readonly [string, ...string[]]),
  fun: csvEnum(ACTIVITIES as readonly [string, ...string[]]),
  price_min: z.coerce.number().int().nonnegative().optional(),
  price_max: z.coerce.number().int().positive().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  sort: z.enum(SORT_OPTIONS as readonly [string, ...string[]]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(24),
});

export type ListingsQuery = z.infer<typeof listingsQuerySchema>;

/** Parse `URLSearchParams` into a plain object that the schema can consume. */
export function searchParamsToObject(params: URLSearchParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    out[key] = all.length > 1 ? all : (all[0] ?? '');
  }
  return out;
}
