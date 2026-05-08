import { listingsQuerySchema, type ListingsQuery } from './listings-validator';

/**
 * Returns a fully-populated `ListingsQuery` with the schema's defaults filled
 * in — useful for server callers that don't actually have query params (sitemap,
 * server pages, etc.) and want to avoid hand-rolling all the empty fields.
 */
export const emptyListingsQuery = (overrides?: Partial<ListingsQuery>): ListingsQuery =>
  listingsQuerySchema.parse({ ...(overrides ?? {}) });
