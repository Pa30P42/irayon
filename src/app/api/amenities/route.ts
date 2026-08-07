import { listAmenities } from '@/lib/api/amenities-service';
import { apiOkCached, apiServerError, CACHE_PUBLIC_LIST } from '@/lib/api/api-response';
import { logger } from '@/lib/logger';

/**
 * GET /api/amenities
 *
 * Public amenity catalogue (slug + localized name + category + icon key).
 * Drives the filter modal's amenity groups and the admin form's chips, so a
 * new amenity created in /admin/amenities appears everywhere without a code
 * change.
 */
export async function GET(): Promise<Response> {
  try {
    const data = await listAmenities();
    return apiOkCached({ data }, CACHE_PUBLIC_LIST);
  } catch (err) {
    logger.error('GET /api/amenities failed', { err });
    return apiServerError();
  }
}
