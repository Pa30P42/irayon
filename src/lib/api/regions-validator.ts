import { z } from 'zod';
import { localizedTextSchema } from './localized-text';

/**
 * Body schema for creating a region. Slug is server-derived from `name.en`.
 */
export const regionCreateSchema = z.object({
  name: localizedTextSchema,
  coverImage: z.string().url().nullable().optional().default(null),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});
export type RegionCreateInput = z.infer<typeof regionCreateSchema>;

/**
 * Body schema for updating a region. All fields optional; slug is immutable.
 */
export const regionUpdateSchema = z.object({
  name: localizedTextSchema.optional(),
  coverImage: z.string().url().nullable().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});
export type RegionUpdateInput = z.infer<typeof regionUpdateSchema>;
