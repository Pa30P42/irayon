import { z } from 'zod';

/**
 * Shared zod shape for `{ az, ru, en }` localized text fields. English is
 * required (used as the canonical fallback); az/ru fall back to the English
 * value when omitted in the consuming endpoint's transform.
 */
export const localizedTextSchema = z.object({
  az: z.string().trim().max(200).optional().default(''),
  ru: z.string().trim().max(200).optional().default(''),
  en: z.string().trim().min(1, 'English name is required').max(200),
});

export type LocalizedTextInput = z.infer<typeof localizedTextSchema>;
