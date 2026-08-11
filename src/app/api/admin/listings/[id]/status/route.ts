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
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { after } from 'next/server';
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
  // CSRF: Auth.js protects its own endpoints; every other user-initiated
  // mutation opts in here explicitly.
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  // `force` skips the strict-check caches: a suspension that applies to the
  // next read but not the next write is not a suspension.
  const auth = await requireAdmin(request, { force: true });
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
    after(() =>
      recordAdminLog({
        actor: auth.user,
        action: 'listing.status',
        target: id,
        metadata: { slug: updated.slug, status },
      }),
    );
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
