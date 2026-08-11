import { recordAdminLog } from '@/lib/admin-log';
import { apiBadRequest, apiBadRequestRaw, apiOk, apiServerError } from '@/lib/api/api-response';
import { listRegionsWithVillages } from '@/lib/api/listings-service';
import { regionCreateSchema } from '@/lib/api/regions-validator';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { slugify, uniqueSlug } from '@/lib/slug';
import type { Prisma } from '@prisma/client';
import { after } from 'next/server';

/**
 * GET /api/admin/regions
 *
 * Returns the full region catalogue with villages and counts. Auth is
 * enforced both here and by the `/admin` middleware guard (defense in depth).
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const data = await listRegionsWithVillages();
    return apiOk({ data });
  } catch (err) {
    logger.error('GET /api/admin/regions failed', { err });
    return apiServerError('Fetch failed');
  }
}

/**
 * POST /api/admin/regions
 *
 * Creates a new region. Slug is auto-derived from `name.en` and disambiguated
 * against existing region slugs.
 */
export async function POST(request: Request): Promise<Response> {
  // CSRF: Auth.js protects its own endpoints; every other user-initiated
  // mutation opts in here explicitly.
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  // `force` skips the strict-check caches: a suspension that applies to the
  // next read but not the next write is not a suspension.
  const auth = await requireAdmin(request, { force: true });
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }

  const parsed = regionCreateSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const input = parsed.data;

  const baseSlug = slugify(input.name.en);
  if (!baseSlug) return apiBadRequestRaw('Could not derive a slug from the English name');

  const existing = await prisma.region.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const slug = uniqueSlug(baseSlug, new Set(existing.map((r) => r.slug)));

  try {
    const created = await prisma.region.create({
      data: {
        slug,
        name: {
          az: input.name.az || input.name.en,
          ru: input.name.ru || input.name.en,
          en: input.name.en,
        } as Prisma.InputJsonValue,
        coverImage: input.coverImage ?? null,
        featured: input.featured,
        sortOrder: input.sortOrder,
      },
      select: { id: true, slug: true },
    });
    after(() =>
      recordAdminLog({
        actor: auth.user,
        action: 'region.create',
        target: created.id,
        metadata: { slug: created.slug },
      }),
    );
    revalidateListingSurfaces();
    return apiOk(created, { status: 201 });
  } catch (err) {
    logger.error('POST /api/admin/regions failed', { err });
    return apiServerError('Create failed');
  }
}
