import {
  apiNotFound,
  apiOkCached,
  apiServerError,
  CACHE_PUBLIC_LIST,
} from '@/lib/api/api-response';
import { listVillagesByRegionSlug } from '@/lib/api/listings-service';
import { logger } from '@/lib/logger';

type Context = { params: Promise<{ slug: string }> };

/**
 * GET /api/regions/:slug/villages
 *
 * Public endpoint used by the listing form's region→village cascade and by
 * the public filter modal. Ordered by `sortOrder` then slug. The service does
 * the region lookup itself and returns null for unknown slugs — no separate
 * existence-check query.
 */
export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { slug } = await params;
  try {
    const data = await listVillagesByRegionSlug(slug);
    if (data === null) return apiNotFound(`Region "${slug}" not found`);
    return apiOkCached({ data }, CACHE_PUBLIC_LIST);
  } catch (err) {
    logger.error(`GET /api/regions/${slug}/villages failed`, { err });
    return apiServerError('Fetch failed');
  }
}
