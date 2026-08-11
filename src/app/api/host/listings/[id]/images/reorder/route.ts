import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireListingOwner, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { after } from 'next/server';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };

const reorderSchema = z.object({
  order: z.array(z.string().min(1)).min(1).max(50),
});

/**
 * PATCH /api/host/listings/:id/images/reorder
 *
 * Reordering applies LIVE even on an approved listing, and that is deliberate:
 * every photo in the set has already been approved individually, so a
 * permutation introduces no unreviewed content — only a different arrangement
 * of content a moderator already accepted.
 *
 * There is ONE shared `order` sequence across all moderation states. The public
 * select filters first and sorts second, so a hidden `PENDING_ADD` sitting at
 * position 0 simply doesn't appear and the visible photos keep their relative
 * order. The stale-set guard therefore operates over the HOST-VISIBLE set (all
 * states), which is exactly what the client rendered.
 */
export async function PATCH(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const { id } = await params;
  const auth = await requireListingOwner(id, { force: true });
  if (!auth.ok) return auth.response;

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
    if (!listing) return apiNotFound('Not found');

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
        action: 'host.listing.images.reorder',
        target: id,
        metadata: { cover: order[0] ?? null, count: order.length },
      }),
    );
    revalidateListingSurfaces(listing.slug);
    return apiOk({ ok: true });
  } catch (err) {
    logger.error(`PATCH /api/host/listings/${id}/images/reorder failed`, { err });
    return apiServerError('Reorder failed');
  }
}
