import { recordAdminLog } from '@/lib/admin-log';
import { apiConflict, apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { markImageForRemoval } from '@/lib/api/listing-moderation';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireListingOwner, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { MIN_LISTING_IMAGES, deleteListingImageByUrl } from '@/lib/storage';
import { $Enums } from '@prisma/client';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string; imageId: string }> };

/**
 * DELETE /api/host/listings/:id/images/:imageId
 *
 * What this actually does depends on whether the listing is public:
 *
 *   - not yet approved → the row (and its stored blob) goes immediately;
 *   - already approved → the row is flagged `PENDING_REMOVE` and STAYS
 *     publicly visible until a moderator confirms. A host doesn't get to
 *     change approved content unilaterally.
 */
export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const { id, imageId } = await params;
  const auth = await requireListingOwner(id, { force: true });
  if (!auth.ok) return auth.response;

  const [image, listing] = await Promise.all([
    prisma.image.findFirst({
      where: { id: imageId, listingId: id },
      select: { id: true, url: true, moderationState: true },
    }),
    prisma.listing.findUnique({
      where: { id },
      select: { slug: true, moderationStatus: true },
    }),
  ]);
  if (!image || !listing) return apiNotFound('Not found');

  /**
   * First of the two guards against emptying a live listing's photo set: a
   * host could otherwise mark every photo `PENDING_REMOVE`, add nothing, and
   * an approval would leave a live listing with zero images — the create
   * form's minimum-image validation never runs on this path. The authoritative
   * guard is in the approve handler; this one gives immediate feedback.
   */
  const remaining = await prisma.image.count({
    where: {
      listingId: id,
      id: { not: image.id },
      moderationState: { not: $Enums.ImageModerationState.PENDING_ADD },
    },
  });
  if (remaining < MIN_LISTING_IMAGES) {
    return apiConflict('min_images', {
      images: [`A listing must keep at least ${MIN_LISTING_IMAGES} photo(s)`],
    });
  }

  const action = markImageForRemoval(
    { moderationStatus: listing.moderationStatus },
    auth.user.role === 'admin' ? 'admin' : 'host',
  );

  try {
    if (action.kind === 'mark') {
      await prisma.image.update({
        where: { id: image.id },
        data: { moderationState: $Enums.ImageModerationState.PENDING_REMOVE },
      });
      after(() =>
        recordAdminLog({
          actor: auth.user,
          action: 'host.listing.image.markRemoval',
          target: `${id}/${imageId}`,
        }),
      );
      // Nothing changed publicly — the photo is still on the page.
      return apiOk({ deleted: false, pendingRemoval: true });
    }

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
        action: 'host.listing.image.delete',
        target: `${id}/${imageId}`,
        metadata: { storageDeleted },
      });
    });
    revalidateListingSurfaces(listing.slug);
    return apiOk({ deleted: true, pendingRemoval: false });
  } catch (err) {
    logger.error(`DELETE /api/host/listings/${id}/images/${imageId} failed`, { err });
    return apiServerError('Delete failed');
  }
}
