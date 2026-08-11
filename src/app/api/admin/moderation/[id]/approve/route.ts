import { recordAdminLog } from '@/lib/admin-log';
import { apiConflict, apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { moderateListing } from '@/lib/api/moderation-service';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { SITE } from '@/lib/constants';
import { sendEmail } from '@/lib/email/send-email';
import { logger } from '@/lib/logger';
import { deleteListingImageByUrl } from '@/lib/storage';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/moderation/:id/approve
 *
 * Merges any parked edits, promotes `PENDING_ADD` photos to live, drops the
 * ones flagged for removal, and publishes the result.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireAdmin(request, { force: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const result = await moderateListing({
      listingId: id,
      decision: 'approve',
      moderatorUserId: auth.user.breakGlass ? null : auth.user.id,
    });

    if (result.kind === 'not-found') return apiNotFound('Listing not found');
    if (result.kind === 'would-empty-images') {
      // Not a validation nit — approving here would put a live listing on the
      // public site with no photos at all. The queue UI surfaces this as a
      // reason to REJECT, never as something to click past.
      return apiConflict('approval_would_empty_images', {
        images: ['Approving would leave this listing with no photos'],
      });
    }

    after(async () => {
      // Blob cleanup for the rows the transaction removed. Best-effort: an
      // orphaned object is a storage cost, not a correctness problem.
      for (const url of result.removedImageUrls) {
        try {
          await deleteListingImageByUrl(url);
        } catch (err) {
          logger.error('storage cleanup failed after approval', { err, url });
        }
      }

      await recordAdminLog({
        actor: auth.user,
        action: 'listing.moderation.approve',
        target: id,
        metadata: { slug: result.slug, removedImages: result.removedImageUrls.length },
      });

      // Email is a layer ON TOP of the state change, never the record of it —
      // the listing is already live whether or not this send succeeds.
      if (result.hostEmail) {
        await sendEmail({
          to: result.hostEmail,
          locale: result.hostLocale,
          template: 'listing-approved',
          data: {
            listingTitle: result.listingTitleEn,
            listingUrl: `${SITE.url}/${result.hostLocale}/listings/${result.slug}`,
            recipientName: result.hostName,
          },
        });
      }
    });

    revalidateListingSurfaces(result.slug);
    return apiOk({ ok: true, slug: result.slug });
  } catch (err) {
    logger.error(`POST /api/admin/moderation/${id}/approve failed`, { err });
    return apiServerError('Approval failed');
  }
}
