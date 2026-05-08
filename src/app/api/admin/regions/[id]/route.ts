import { requireAdmin } from '@/lib/admin-auth';
import {
  apiBadRequest,
  apiConflict,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { regionUpdateSchema } from '@/lib/api/regions-validator';
import { prisma } from '@/lib/prisma';
import type { LocalizedText, RegionWithVillages } from '@/types';
import type { Prisma } from '@prisma/client';

type Context = { params: Promise<{ id: string }> };

/** Shapes a region row with villages and counts to the public DTO. */
const toDto = (
  row: Prisma.RegionGetPayload<{
    include: {
      villages: true;
      _count: { select: { listings: true; villages: true } };
    };
  }>,
): RegionWithVillages => ({
  id: row.id,
  slug: row.slug,
  name: row.name as unknown as LocalizedText,
  coverImage: row.coverImage,
  featured: row.featured,
  sortOrder: row.sortOrder,
  listingCount: row._count.listings,
  villageCount: row._count.villages,
  villages: row.villages
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug))
    .map((v) => ({
      id: v.id,
      slug: v.slug,
      regionId: v.regionId,
      regionSlug: row.slug,
      name: v.name as unknown as LocalizedText,
      sortOrder: v.sortOrder,
    })),
});

export async function GET(request: Request, { params }: Context): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const row = await prisma.region.findUnique({
      where: { id },
      include: {
        villages: true,
        _count: { select: { listings: true, villages: true } },
      },
    });
    if (!row) return apiNotFound(`Region "${id}" not found`);
    return apiOk(toDto(row));
  } catch (err) {
    console.error(`GET /api/admin/regions/${id} failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Fetch failed');
  }
}

/**
 * PATCH /api/admin/regions/:id
 *
 * Slug is intentionally not editable — bookmarked filter URLs would break.
 */
export async function PATCH(request: Request, { params }: Context): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiServerError('Invalid JSON body');
  }

  const parsed = regionUpdateSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const input = parsed.data;

  const data: Prisma.RegionUpdateInput = {};
  if (input.name) {
    data.name = {
      az: input.name.az || input.name.en,
      ru: input.name.ru || input.name.en,
      en: input.name.en,
    } as Prisma.InputJsonValue;
  }
  if (input.coverImage !== undefined) data.coverImage = input.coverImage;
  if (input.featured !== undefined) data.featured = input.featured;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  try {
    await prisma.region.update({ where: { id }, data });
    const row = await prisma.region.findUnique({
      where: { id },
      include: { villages: true, _count: { select: { listings: true, villages: true } } },
    });
    if (!row) return apiNotFound(`Region "${id}" not found`);
    return apiOk(toDto(row));
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025') {
      return apiNotFound(`Region "${id}" not found`);
    }
    console.error(`PATCH /api/admin/regions/${id} failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Update failed');
  }
}

/**
 * DELETE /api/admin/regions/:id
 *
 * Returns 409 with structured counts if the region still has listings or
 * villages. Admin must reassign or delete those first — silent cascade would
 * destroy data that took manual entry.
 */
export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const counts = await prisma.region.findUnique({
      where: { id },
      select: { _count: { select: { listings: true, villages: true } } },
    });
    if (!counts) return apiNotFound(`Region "${id}" not found`);

    const { listings, villages } = counts._count;
    if (listings > 0 || villages > 0) {
      return apiConflict('Region has dependent records — reassign or delete them first', {
        listings: [String(listings)],
        villages: [String(villages)],
      });
    }

    await prisma.region.delete({ where: { id } });
    return apiOk({ deleted: true });
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025') {
      return apiNotFound(`Region "${id}" not found`);
    }
    console.error(`DELETE /api/admin/regions/${id} failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Delete failed');
  }
}
