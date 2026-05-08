// 60s edge cache: catalog can lag a minute behind the admin without anyone noticing.
export const revalidate = 60;

import {
  apiBadRequest,
  apiPaginated,
  apiServerError,
  type Paginated,
} from '@/lib/api/api-response';
import { listListings } from '@/lib/api/listings-service';
import { listingsQuerySchema, searchParamsToObject } from '@/lib/api/listings-validator';
import type { Listing } from '@/types';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = listingsQuerySchema.safeParse(searchParamsToObject(url.searchParams));
  if (!parsed.success) return apiBadRequest(parsed.error);

  try {
    const result = await listListings(parsed.data);
    return apiPaginated<Listing>(result satisfies Paginated<Listing>);
  } catch (err) {
    console.error('GET /api/listings failed', err);
    return apiServerError();
  }
}
