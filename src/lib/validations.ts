import { z } from 'zod';
import { AMENITIES, CATEGORIES } from './constants';

export const localeSchema = z.enum(['az', 'ru', 'en']);

export const listingCategorySchema = z.enum(CATEGORIES as readonly [string, ...string[]]);

/** Region slugs are data-driven (admin-managed); validate as plain string. */
export const regionSchema = z.string().min(1);

export const amenitySchema = z.enum(AMENITIES as readonly [string, ...string[]]);

export const listingFiltersSchema = z.object({
  category: listingCategorySchema.optional(),
  region: regionSchema.optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  amenities: z.array(amenitySchema).optional(),
});

export type ListingFiltersInput = z.infer<typeof listingFiltersSchema>;
