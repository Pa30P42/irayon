// NOTE: no `export const revalidate` — CDN caching happens via the
// Cache-Control header below, which admin mutations purge through
// `revalidatePath('/api/listings')` (see revalidate-listings.ts).
import {
  apiNotFound,
  apiOkCached,
  apiServerError,
  CACHE_PUBLIC_DETAIL,
} from '@/lib/api/api-response';
import { getListingBySlug } from '@/lib/api/listings-service';
import { logger } from '@/lib/logger';

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { slug } = await params;

  try {
    const listing = await getListingBySlug(slug);
    if (!listing) return apiNotFound(`Listing "${slug}" not found`);
    return apiOkCached(listing, CACHE_PUBLIC_DETAIL);
  } catch (err) {
    logger.error(`GET /api/listings/${slug} failed`, { err });
    return apiServerError();
  }
}
