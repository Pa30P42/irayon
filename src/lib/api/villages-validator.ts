import { z } from 'zod';
import { localizedTextSchema } from './localized-text';

/**
 * Body schema for creating a village within a region. Slug is server-derived
 * from `name.en` and unique per parent region.
 */
export const villageCreateSchema = z.object({
  name: localizedTextSchema,
  sortOrder: z.coerce.number().int().default(0),
});
export type VillageCreateInput = z.infer<typeof villageCreateSchema>;

/**
 * Body schema for updating a village. Slug is immutable; admin can move a
 * village to a different region by setting `regionId`.
 */
export const villageUpdateSchema = z.object({
  name: localizedTextSchema.optional(),
  sortOrder: z.coerce.number().int().optional(),
  regionId: z.string().min(1).optional(),
});
export type VillageUpdateInput = z.infer<typeof villageUpdateSchema>;
