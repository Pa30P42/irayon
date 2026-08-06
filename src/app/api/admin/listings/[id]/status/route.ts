import { requireAdmin } from '@/lib/admin-auth';
import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { isUsingMockData } from '@/lib/api/listings-service';
import { toListingStatus } from '@/lib/api/prisma-enums';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
});

/**
 * PATCH /api/admin/listings/:id/status
 *
 * Flips only the listing's status — the admin list's publish/unpublish/archive
 * actions shouldn't have to round-trip the full edit payload.
 */
export async function PATCH(request: Request, { params }: Context): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const { status } = parsed.data;

  if (isUsingMockData()) {
    // Mock rows are static; acknowledge so the admin UI stays usable in dev.
    return apiOk({ id, slug: null, status });
  }

  try {
    const updated = await prisma.listing.update({
      where: { id },
      data: { status: toListingStatus(status) },
      select: { id: true, slug: true, status: true },
    });
    await recordAdminLog({
      action: 'listing.status',
      target: id,
      metadata: { slug: updated.slug, status },
    });
    revalidateListingSurfaces(updated.slug);
    return apiOk({ id: updated.id, slug: updated.slug, status });
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025') {
      return apiNotFound(`Listing "${id}" not found`);
    }
    logger.error(`PATCH /api/admin/listings/${id}/status failed`, { err });
    return apiServerError('Status update failed');
  }
}
