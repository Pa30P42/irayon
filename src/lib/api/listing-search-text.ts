import type { LocalizedText } from '@/types';

/**
 * Denormalized lowercase haystack for the catalogue `q` search — all three
 * title locales + address. MUST stay in sync with the SQL backfill in
 * migration 20260806000200 (same fields, same order, lowercased): every
 * listing create/update recomputes it here.
 */
export function buildListingSearchText(title: LocalizedText, address: string): string {
  return [title.az, title.ru, title.en, address].join(' ').toLowerCase();
}
