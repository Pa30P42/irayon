import { requireAdmin } from '@/lib/admin-auth';
import { recordAdminLog } from '@/lib/admin-log';
import { apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { deleteListingImageByUrl } from '@/lib/storage';

type Context = { params: Promise<{ id: string; imageId: string }> };

/**
 * DELETE /api/admin/listings/:id/images/:imageId
 *
 * Removes the row and (if the URL belongs to our bucket) the storage object.
 * External URLs (e.g. Unsplash placeholders from the seed) are kept on the
 * filesystem — only the DB row is deleted.
 */
export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id, imageId } = await params;

  const image = await prisma.image.findFirst({
    where: { id: imageId, listingId: id },
    select: { id: true, url: true, listing: { select: { slug: true } } },
  });
  if (!image) return apiNotFound('Image not found for this listing');

  try {
    const storage = await deleteListingImageByUrl(image.url);
    await prisma.image.delete({ where: { id: image.id } });
    await recordAdminLog({
      action: 'listing.image.delete',
      target: `${id}/${imageId}`,
      metadata: { storageDeleted: storage.deleted },
    });
    revalidateListingSurfaces(image.listing.slug);
    return apiOk({ deleted: true, storage });
  } catch (err) {
    logger.error(`DELETE /api/admin/listings/${id}/images/${imageId} failed`, { err });
    return apiServerError('Delete failed');
  }
}
