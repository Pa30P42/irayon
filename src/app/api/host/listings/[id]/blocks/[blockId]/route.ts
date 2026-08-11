import { apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { requireListingOwner, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ id: string; blockId: string }> };

/** DELETE — reopen blocked dates. */
export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const { id, blockId } = await params;
  const auth = await requireListingOwner(id, { force: true });
  if (!auth.ok) return auth.response;

  try {
    // Scoped by listingId as well as blockId: owning one listing must not let a
    // host delete blocks on another.
    const { count } = await prisma.availabilityBlock.deleteMany({
      where: { id: blockId, listingId: id },
    });
    if (count === 0) return apiNotFound('Not found');
    return apiOk({ deleted: true });
  } catch (err) {
    logger.error(`DELETE /api/host/listings/${id}/blocks/${blockId} failed`, { err });
    return apiServerError();
  }
}
