import { recordAdminLog } from '@/lib/admin-log';
import { apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { deleteListingImageByUrl } from '@/lib/storage';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string; imageId: string }> };

/**
 * DELETE /api/admin/listings/:id/images/:imageId
 *
 * Removes the row and (if the URL belongs to our bucket) the storage object.
 * External URLs (e.g. Unsplash placeholders from the seed) are kept on the
 * filesystem — only the DB row is deleted.
 */
export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  // CSRF: Auth.js protects its own endpoints; every other user-initiated
  // mutation opts in here explicitly.
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  // `force` skips the strict-check caches: a suspension that applies to the
  // next read but not the next write is not a suspension.
  const auth = await requireAdmin(request, { force: true });
  if (!auth.ok) return auth.response;

  const { id, imageId } = await params;

  const image = await prisma.image.findFirst({
    where: { id: imageId, listingId: id },
    select: { id: true, url: true, listing: { select: { slug: true } } },
  });
  if (!image) return apiNotFound('Image not found for this listing');

  try {
    // Row first — that's what makes the image disappear from the site. The
    // storage object removal runs after the response flushes; an orphaned
    // blob is a cleanup concern, not something the admin should wait on.
    await prisma.image.delete({ where: { id: image.id } });
    after(async () => {
      let storageDeleted = false;
      try {
        storageDeleted = (await deleteListingImageByUrl(image.url)).deleted;
      } catch (err) {
        logger.error(`storage cleanup failed for image ${imageId}`, { err, url: image.url });
      }
      await recordAdminLog({
        actor: auth.user,
        action: 'listing.image.delete',
        target: `${id}/${imageId}`,
        metadata: { storageDeleted },
      });
    });
    revalidateListingSurfaces(image.listing.slug);
    return apiOk({ deleted: true });
  } catch (err) {
    logger.error(`DELETE /api/admin/listings/${id}/images/${imageId} failed`, { err });
    return apiServerError('Delete failed');
  }
}
