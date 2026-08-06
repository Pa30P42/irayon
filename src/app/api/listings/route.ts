// NOTE: no `export const revalidate` here — the handler reads the request URL,
// which makes the route dynamic and the directive inert. CDN caching happens
// via the Cache-Control header on the response instead.

import {
  apiBadRequest,
  apiPaginated,
  apiServerError,
  CACHE_PUBLIC_LIST,
  type Paginated,
} from '@/lib/api/api-response';
import { listListings } from '@/lib/api/listings-service';
import { listingsQuerySchema, searchParamsToObject } from '@/lib/api/listings-validator';
import { logger } from '@/lib/logger';
import type { Listing } from '@/types';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = listingsQuerySchema.safeParse(searchParamsToObject(url.searchParams));
  if (!parsed.success) return apiBadRequest(parsed.error);

  try {
    const result = await listListings(parsed.data);
    return apiPaginated<Listing>(result satisfies Paginated<Listing>, CACHE_PUBLIC_LIST);
  } catch (err) {
    logger.error('GET /api/listings failed', { err });
    return apiServerError();
  }
}
