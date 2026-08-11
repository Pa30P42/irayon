import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { hostListingSchema } from '@/lib/api/host-listing-validator';
import { updateListingAsActor } from '@/lib/api/listing-write-service';
import { getListingById } from '@/lib/api/listings-service';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireListingOwner, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/host/listings/:id — seeds the host edit form.
 *
 * Ownership failures answer 404, never 403: a 403 confirms the id is real,
 * which is enough to enumerate other hosts' private listings.
 */
export async function GET(request: Request, { params }: Context): Promise<Response> {
  const { id } = await params;
  const auth = await requireListingOwner(id);
  if (!auth.ok) return auth.response;

  try {
    const listing = await getListingById(id);
    if (!listing) return apiNotFound('Not found');
    return apiOk(listing);
  } catch (err) {
    logger.error(`GET /api/host/listings/${id} failed`, { err });
    return apiServerError('Fetch failed');
  }
}

/**
 * PATCH /api/host/listings/:id
 *
 * Runs through the SAME service the admin route uses, with `actor: 'host'`.
 * Significant edits (title, description, address, coordinates, place type,
 * region/village, phone) are parked in `pendingChanges` while the approved
 * listing stays live and unchanged; everything else applies immediately.
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

  const parsed = hostListingSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);

  try {
    // An ADMIN editing through the host cabinet still acts as an admin — see
    // the actor rule in `listing-moderation.ts`. Without this an admin editing
    // one of their own (backfilled) listings would queue it for their own
    // approval.
    const actor = auth.user.role === 'admin' ? 'admin' : 'host';
    const outcome = await updateListingAsActor({
      listingId: id,
      input: parsed.data,
      actor,
      actorUserId: auth.user.breakGlass ? null : auth.user.id,
    });
    if (outcome.kind === 'not-found') return apiNotFound('Not found');

    after(() =>
      recordAdminLog({
        actor: auth.user,
        action: outcome.kind === 'queued' ? 'host.listing.update.queued' : 'host.listing.update',
        target: id,
        metadata:
          outcome.kind === 'queued'
            ? { slug: outcome.listing.slug, queuedFields: outcome.fields }
            : { slug: outcome.listing.slug, status: parsed.data.status },
      }),
    );

    // ISR invariant: revalidate unconditionally whenever ANY field applied
    // live, not per-field. A host unpublishing must not keep serving from
    // cache, and an unnecessary revalidation costs nothing next to a missed
    // one. Even a queued edit applies its non-significant half.
    revalidateListingSurfaces(outcome.listing.slug);

    return apiOk({
      ...outcome.listing,
      moderation: {
        queued: outcome.kind === 'queued',
        pendingFields: outcome.kind === 'queued' ? outcome.fields : [],
      },
    });
  } catch (err) {
    logger.error(`PATCH /api/host/listings/${id} failed`, { err });
    return apiServerError('Update failed');
  }
}
