import { requireAdmin } from '@/lib/admin-auth';
import {
  apiBadRequest,
  apiConflict,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { villageUpdateSchema } from '@/lib/api/villages-validator';
import { prisma } from '@/lib/prisma';
import type { LocalizedText, Village } from '@/types';
import type { Prisma } from '@prisma/client';

type Context = { params: Promise<{ id: string }> };

const toDto = (
  row: Prisma.VillageGetPayload<{ include: { region: { select: { slug: true } } } }>,
): Village => ({
  id: row.id,
  slug: row.slug,
  regionId: row.regionId,
  regionSlug: row.region.slug,
  name: row.name as unknown as LocalizedText,
  sortOrder: row.sortOrder,
});

export async function GET(request: Request, { params }: Context): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const row = await prisma.village.findUnique({
      where: { id },
      include: { region: { select: { slug: true } } },
    });
    if (!row) return apiNotFound(`Village "${id}" not found`);
    return apiOk(toDto(row));
  } catch (err) {
    console.error(`GET /api/admin/villages/${id} failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Fetch failed');
  }
}

/**
 * PATCH /api/admin/villages/:id
 *
 * Allows renaming, reordering, and reassigning to a different region. Slug
 * is immutable so URL filters stay stable.
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

  const parsed = villageUpdateSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const input = parsed.data;

  const data: Prisma.VillageUpdateInput = {};
  if (input.name) {
    data.name = {
      az: input.name.az || input.name.en,
      ru: input.name.ru || input.name.en,
      en: input.name.en,
    } as Prisma.InputJsonValue;
  }
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  // Region reassignment goes through the relation field, which lets Prisma
  // validate the target exists rather than silently writing a dangling FK.
  if (input.regionId) {
    const target = await prisma.region.findUnique({
      where: { id: input.regionId },
      select: { id: true },
    });
    if (!target) return apiNotFound(`Target region "${input.regionId}" not found`);
    data.region = { connect: { id: input.regionId } };
  }

  try {
    await prisma.village.update({ where: { id }, data });
    const row = await prisma.village.findUnique({
      where: { id },
      include: { region: { select: { slug: true } } },
    });
    if (!row) return apiNotFound(`Village "${id}" not found`);
    return apiOk(toDto(row));
  } catch (err) {
    if (err instanceof Error && 'code' in err) {
      const code = (err as { code: string }).code;
      if (code === 'P2025') return apiNotFound(`Village "${id}" not found`);
      if (code === 'P2002')
        return apiConflict('A village with this slug already exists in the target region');
    }
    console.error(`PATCH /api/admin/villages/${id} failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Update failed');
  }
}

/**
 * DELETE /api/admin/villages/:id
 *
 * Returns 409 if any listings reference this village. The DB schema would
 * silently SetNull on the FK, but admins should be aware they're orphaning
 * listings — better to surface the count and let them reassign first.
 */
export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const village = await prisma.village.findUnique({
      where: { id },
      select: { _count: { select: { listings: true } } },
    });
    if (!village) return apiNotFound(`Village "${id}" not found`);

    const { listings } = village._count;
    if (listings > 0) {
      return apiConflict(
        'Village has dependent listings — reassign them to another village first',
        { listings: [String(listings)] },
      );
    }

    await prisma.village.delete({ where: { id } });
    return apiOk({ deleted: true });
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025') {
      return apiNotFound(`Village "${id}" not found`);
    }
    console.error(`DELETE /api/admin/villages/${id} failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Delete failed');
  }
}
