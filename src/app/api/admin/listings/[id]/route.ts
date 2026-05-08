import { apiBadRequest, apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { createListingSchema } from '@/lib/api/listings-create-validator';
import { deleteListing, getListingById, updateListing } from '@/lib/api/listings-service';

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/listings/:id
 *
 * Fetches a single listing by id so the admin edit form can seed itself.
 * Public listings are addressable by slug; admins use the immutable id so
 * a slug change wouldn't break the editor.
 */
export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { id } = await params;

  try {
    const listing = await getListingById(id);
    if (!listing) return apiNotFound(`Listing "${id}" not found`);
    return apiOk(listing);
  } catch (err) {
    console.error(`GET /api/admin/listings/${id} failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Fetch failed');
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
  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiServerError('Invalid JSON body');
  }

  const parsed = createListingSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);

  try {
    const updated = await updateListing(id, parsed.data);
    if (!updated) return apiNotFound(`Listing "${id}" not found`);
    return apiOk(updated);
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025') {
      return apiNotFound(`Listing "${id}" not found`);
    }
    console.error(`PATCH /api/admin/listings/${id} failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Update failed');
  }
}

/**
 * DELETE /api/admin/listings/:id
 *
 * Removes the listing row (cascades to image + amenity link rows) and
 * best-effort removes its bucket-stored images. Auth is enforced by the
 * `/admin` middleware guard.
 */
export async function DELETE(_request: Request, { params }: Context): Promise<Response> {
  const { id } = await params;

  try {
    const result = await deleteListing(id);
    return apiOk(result);
  } catch (err) {
    // Prisma raises P2025 when the row to delete doesn't exist.
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025') {
      return apiNotFound(`Listing "${id}" not found`);
    }
    console.error(`DELETE /api/admin/listings/${id} failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Delete failed');
  }
}
