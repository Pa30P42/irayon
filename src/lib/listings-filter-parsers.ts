import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  type UseQueryStatesKeysMap,
} from 'nuqs';
import {
  ACTIVITIES,
  BASIC_AMENITIES,
  EXTRA_AMENITIES,
  GUEST_RANGES,
  MEALS,
  PLACEMENTS,
  PLACE_TYPES,
  SORT_OPTIONS,
} from './constants';

export const listingsFilterParsers = {
  q: parseAsString.withDefault(''),
  /** Village slugs are data-driven; no enum check at the parser level. */
  village: parseAsArrayOf(parseAsString).withDefault([]),
  type: parseAsArrayOf(parseAsStringLiteral(PLACE_TYPES)).withDefault([]),
  guests: parseAsStringLiteral(GUEST_RANGES),
  placement: parseAsArrayOf(parseAsStringLiteral(PLACEMENTS)).withDefault([]),
  food: parseAsArrayOf(parseAsStringLiteral(MEALS)).withDefault([]),
  extra: parseAsArrayOf(parseAsStringLiteral(EXTRA_AMENITIES)).withDefault([]),
  basic: parseAsArrayOf(parseAsStringLiteral(BASIC_AMENITIES)).withDefault([]),
  fun: parseAsArrayOf(parseAsStringLiteral(ACTIVITIES)).withDefault([]),
  sort: parseAsStringLiteral(SORT_OPTIONS),
  view: parseAsStringLiteral(['grid', 'list'] as const).withDefault('grid'),
} satisfies UseQueryStatesKeysMap;
