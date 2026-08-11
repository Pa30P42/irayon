import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { updateListingAsActor } from '@/lib/api/listing-write-service';
import { createListingSchema } from '@/lib/api/listings-create-validator';
import { deleteListing, getListingById, isUsingMockData } from '@/lib/api/listings-service';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/listings/:id
 *
 * Fetches a single listing by id so the admin edit form can seed itself.
 * Public listings are addressable by slug; admins use the immutable id so
 * a slug change wouldn't break the editor.
 */
export async function GET(request: Request, { params }: Context): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const listing = await getListingById(id);
    if (!listing) return apiNotFound(`Listing "${id}" not found`);
    return apiOk(listing);
  } catch (err) {
    logger.error(`GET /api/admin/listings/${id} failed`, { err });
    return apiServerError('Fetch failed');
  }
}

/**
 * PATCH /api/admin/listings/:id
 *
 * Replaces all editable fields with the submitted payload (same shape as
 * the create endpoint). Slug is intentionally NOT recomputed — the public
 * URL stays stable even when the title changes.
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

  const parsed = createListingSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);

  try {
    if (isUsingMockData()) return apiNotFound(`Listing "${id}" not found`);

    // Same shared service the host cabinet calls — `actor: 'admin'` is the only
    // difference, and it is what makes this edit apply live, never populate
    // `pendingChanges`, and stamp the row as moderated.
    const outcome = await updateListingAsActor({
      listingId: id,
      input: parsed.data,
      actor: 'admin',
      actorUserId: auth.user.breakGlass ? null : auth.user.id,
    });
    if (outcome.kind === 'not-found') return apiNotFound(`Listing "${id}" not found`);
    const updated = outcome.listing;
    after(() =>
      recordAdminLog({
        actor: auth.user,
        action: 'listing.update',
        target: id,
        metadata: { slug: updated.slug, status: parsed.data.status },
      }),
    );
    revalidateListingSurfaces(updated.slug);
    return apiOk(updated);
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025') {
      return apiNotFound(`Listing "${id}" not found`);
    }
    logger.error(`PATCH /api/admin/listings/${id} failed`, { err });
    return apiServerError('Update failed');
  }
}

/**
 * DELETE /api/admin/listings/:id
 *
 * Removes the listing row (cascades to image + amenity link rows) and
 * best-effort removes its bucket-stored images.
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

  const { id } = await params;

  try {
    const result = await deleteListing(id);
    after(() =>
      recordAdminLog({
        actor: auth.user,
        action: 'listing.delete',
        target: id,
        metadata: {
          slug: result.slug,
          storageRemoved: result.storageRemoved,
          storageFailed: result.storageFailed,
        },
      }),
    );
    revalidateListingSurfaces(result.slug ?? undefined);
    return apiOk(result);
  } catch (err) {
    // Prisma raises P2025 when the row to delete doesn't exist.
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025') {
      return apiNotFound(`Listing "${id}" not found`);
    }
    logger.error(`DELETE /api/admin/listings/${id} failed`, { err });
    return apiServerError('Delete failed');
  }
}
