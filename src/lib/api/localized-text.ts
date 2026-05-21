import type { LocalizedText } from '@/types';
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

/**
 * Coerce a Prisma `Json` value into `LocalizedText`. The write path validates
 * with `localizedTextSchema`, so DB rows always carry the right shape — this
 * is a narrowing helper that replaces scattered `as unknown as LocalizedText`
 * casts with a single typed bridge, plus a defensive fallback for rows that
 * somehow predate the schema.
 */
export function parseLocalized(value: unknown): LocalizedText {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const en = typeof v.en === 'string' ? v.en : '';
    return {
      az: typeof v.az === 'string' ? v.az : en,
      ru: typeof v.ru === 'string' ? v.ru : en,
      en,
    };
  }
  return { az: '', ru: '', en: '' };
}
