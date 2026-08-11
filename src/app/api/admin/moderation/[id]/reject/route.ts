import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { moderateListing } from '@/lib/api/moderation-service';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { SITE } from '@/lib/constants';
import { sendEmail } from '@/lib/email/send-email';
import { logger } from '@/lib/logger';
import { deleteListingImageByUrl } from '@/lib/storage';
import { after } from 'next/server';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };

const rejectSchema = z.object({
  /**
   * A rejection the host can't act on is just a dead end, so a real
   * explanation is mandatory. 10 characters is low enough not to be
   * bureaucratic and high enough to rule out "no".
   */
  reason: z.string().trim().min(10, 'Give the host at least 10 characters to act on').max(1000),
});

/**
 * POST /api/admin/moderation/:id/reject
 *
 * Discards parked edits, deletes unreviewed photos, restores photos whose
 * removal was refused, and records the reason for the host.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireAdmin(request, { force: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }
  const parsed = rejectSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);

  try {
    const result = await moderateListing({
      listingId: id,
      decision: 'reject',
      reason: parsed.data.reason,
      moderatorUserId: auth.user.breakGlass ? null : auth.user.id,
    });
    if (result.kind === 'not-found') return apiNotFound('Listing not found');
    if (result.kind === 'would-empty-images') {
      // Unreachable on the reject path (rejection only ever removes unreviewed
      // additions), but the union is exhaustive so the compiler keeps us honest.
      return apiServerError('Unexpected moderation state');
    }

    after(async () => {
      for (const url of result.removedImageUrls) {
        try {
          await deleteListingImageByUrl(url);
        } catch (err) {
          logger.error('storage cleanup failed after rejection', { err, url });
        }
      }

      await recordAdminLog({
        actor: auth.user,
        action: 'listing.moderation.reject',
        target: id,
        metadata: {
          slug: result.slug,
          removedImages: result.removedImageUrls.length,
          // Records the deliberate asymmetry: an edit was refused but the
          // previously-approved listing stayed live.
          keptApproved: result.keptApproved,
        },
      });

      if (result.hostEmail) {
        await sendEmail({
          to: result.hostEmail,
          locale: result.hostLocale,
          template: 'listing-rejected',
          data: {
            listingTitle: result.listingTitleEn,
            reason: parsed.data.reason,
            editUrl: `${SITE.url}/${result.hostLocale}/host/listings/${id}/edit`,
            recipientName: result.hostName,
          },
        });
      }
    });

    // A rejection can change the live page (a refused photo removal restores
    // that photo), so revalidate unconditionally.
    revalidateListingSurfaces(result.slug);
    return apiOk({ ok: true, keptApproved: result.keptApproved });
  } catch (err) {
    logger.error(`POST /api/admin/moderation/${id}/reject failed`, { err });
    return apiServerError('Rejection failed');
  }
}
