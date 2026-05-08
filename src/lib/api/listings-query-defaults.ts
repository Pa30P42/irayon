import type { ListingsQuery } from './listings-validator';

/**
 * Returns a fully-populated `ListingsQuery` with the same defaults the zod
 * schema applies — but built directly, without going through `.parse()`.
 *
 * Why not parse: the public API caps `limit ≤ 100` to stop external clients
 * from requesting unbounded pages, but internal callers (sitemap,
 * `generateStaticParams`, server pages) legitimately need 1000+ rows. Running
 * those calls through the schema would trip the cap at build time. Keep the
 * cap on the HTTP boundary; trust internal callers here.
 */
export const emptyListingsQuery = (overrides?: Partial<ListingsQuery>): ListingsQuery => ({
  q: '',
  region: [],
  village: [],
  type: [],
  placement: [],
  food: [],
  extra: [],
  basic: [],
  amenities: [],
  fun: [],
  page: 1,
  limit: 24,
  ...overrides,
});
