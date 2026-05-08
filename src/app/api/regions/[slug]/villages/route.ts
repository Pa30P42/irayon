import { apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { listVillagesByRegionSlug } from '@/lib/api/listings-service';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ slug: string }> };

/**
 * GET /api/regions/:slug/villages
 *
 * Public endpoint used by the listing form's region→village cascade and by
 * the public filter modal. Ordered by `sortOrder` then slug.
 */
export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { slug } = await params;
  try {
    // Cheap existence check so a bad slug returns 404 instead of `data: []`.
    const region = await prisma.region.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!region) return apiNotFound(`Region "${slug}" not found`);

    const data = await listVillagesByRegionSlug(slug);
    return apiOk({ data });
  } catch (err) {
    console.error(`GET /api/regions/${slug}/villages failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Fetch failed');
  }
}
