import { requireAdmin } from '@/lib/admin-auth';
import { apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
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
    select: { id: true, url: true },
  });
  if (!image) return apiNotFound('Image not found for this listing');

  try {
    const storage = await deleteListingImageByUrl(image.url);
    await prisma.image.delete({ where: { id: image.id } });
    return apiOk({ deleted: true, storage });
  } catch (err) {
    console.error(`DELETE /api/admin/listings/${id}/images/${imageId} failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Delete failed');
  }
}
