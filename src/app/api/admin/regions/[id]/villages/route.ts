import { requireAdmin } from '@/lib/admin-auth';
import {
  apiBadRequest,
  apiConflict,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { villageCreateSchema } from '@/lib/api/villages-validator';
import { prisma } from '@/lib/prisma';
import { slugify, uniqueSlug } from '@/lib/slug';
import type { LocalizedText, Village } from '@/types';
import type { Prisma } from '@prisma/client';

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/regions/:id/villages
 *
 * Lists every village in a region, ordered by `sortOrder` then slug.
 */
export async function GET(request: Request, { params }: Context): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const region = await prisma.region.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!region) return apiNotFound(`Region "${id}" not found`);

    const rows = await prisma.village.findMany({
      where: { regionId: region.id },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
    });
    const data: Village[] = rows.map((v) => ({
      id: v.id,
      slug: v.slug,
      regionId: v.regionId,
      regionSlug: region.slug,
      name: v.name as unknown as LocalizedText,
      sortOrder: v.sortOrder,
    }));
    return apiOk({ data });
  } catch (err) {
    console.error(`GET /api/admin/regions/${id}/villages failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Fetch failed');
  }
}

/**
 * POST /api/admin/regions/:id/villages
 *
 * Creates a village under the parent region. Slug is auto-derived from
 * `name.en` and unique-per-region (so "Laza" can exist under both Gabala
 * and Gusar).
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id: regionId } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiServerError('Invalid JSON body');
  }

  const parsed = villageCreateSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const input = parsed.data;

  const region = await prisma.region.findUnique({ where: { id: regionId }, select: { id: true } });
  if (!region) return apiNotFound(`Region "${regionId}" not found`);

  const baseSlug = slugify(input.name.en);
  if (!baseSlug) return apiServerError('Could not derive a slug from the English name');

  // Slug uniqueness scoped to this region only — composite unique index
  // mirrors the same check at the DB layer.
  const existing = await prisma.village.findMany({
    where: { regionId, slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const slug = uniqueSlug(baseSlug, new Set(existing.map((v) => v.slug)));

  try {
    const created = await prisma.village.create({
      data: {
        slug,
        regionId,
        name: {
          az: input.name.az || input.name.en,
          ru: input.name.ru || input.name.en,
          en: input.name.en,
        } as Prisma.InputJsonValue,
        sortOrder: input.sortOrder,
      },
      select: { id: true, slug: true, regionId: true },
    });
    return apiOk(created, { status: 201 });
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
      return apiConflict(`Village "${slug}" already exists in this region`);
    }
    console.error(`POST /api/admin/regions/${regionId}/villages failed`, err);
    return apiServerError(err instanceof Error ? err.message : 'Create failed');
  }
}
