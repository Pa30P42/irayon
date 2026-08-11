import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { after } from 'next/server';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };

const reorderSchema = z.object({
  /** ALL of the listing's image ids in the desired display order. */
  order: z.array(z.string().min(1)).min(1).max(50),
});

/**
 * PATCH /api/admin/listings/:id/images/reorder
 *
 * Rewrites `Image.order` from the submitted id array (index = new order).
 * "Make cover" is just this with the chosen id moved to the front — the
 * public site treats order 0 as the cover.
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
  const parsed = reorderSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const { order } = parsed.data;

  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { slug: true, images: { select: { id: true } } },
    });
    if (!listing) return apiNotFound(`Listing "${id}" not found`);

    // The submitted array must be exactly the listing's image set — a stale
    // client (image deleted/added elsewhere) should refetch, not scramble.
    const current = new Set(listing.images.map((img) => img.id));
    const submitted = new Set(order);
    if (current.size !== submitted.size || ![...current].every((imgId) => submitted.has(imgId))) {
      return apiBadRequestRaw('Image list is stale — reload and try again');
    }

    await prisma.$transaction(
      order.map((imageId, index) =>
        prisma.image.update({ where: { id: imageId }, data: { order: index } }),
      ),
    );

    after(() =>
      recordAdminLog({
        actor: auth.user,
        action: 'listing.images.reorder',
        target: id,
        metadata: { cover: order[0] ?? null, count: order.length },
      }),
    );
    revalidateListingSurfaces(listing.slug);
    return apiOk({ ok: true });
  } catch (err) {
    logger.error(`PATCH /api/admin/listings/${id}/images/reorder failed`, { err });
    return apiServerError('Reorder failed');
  }
}
