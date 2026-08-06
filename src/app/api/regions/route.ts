import { apiOk, apiServerError } from '@/lib/api/api-response';
import { listRegions, listRegionsWithVillages } from '@/lib/api/listings-service';
import { logger } from '@/lib/logger';

/**
 * GET /api/regions
 *
 * Public endpoint. Pass `?include=villages` to embed villages on each
 * region — used by the public filter modal and the home Regions grid.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const includeVillages = url.searchParams.get('include') === 'villages';

  try {
    const data = includeVillages ? await listRegionsWithVillages() : await listRegions();
    return apiOk({ data });
  } catch (err) {
    logger.error('GET /api/regions failed', { err });
    return apiServerError();
  }
}
