import { requireAdmin } from '@/lib/admin-auth';
import { recordAdminLog } from '@/lib/admin-log';
import { listAmenities } from '@/lib/api/amenities-service';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiConflict,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { localizedTextSchema } from '@/lib/api/localized-text';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { isUniqueConstraintError } from '@/lib/prisma-errors';
import { slugify } from '@/lib/slug';
import type { Prisma } from '@prisma/client';
import { after } from 'next/server';
import { z } from 'zod';

const AMENITY_CATEGORIES = ['essentials', 'outdoor', 'kitchen', 'family', 'extras'] as const;

const amenityCreateSchema = z.object({
  name: localizedTextSchema,
  category: z.enum(AMENITY_CATEGORIES).default('extras'),
  icon: z.string().trim().max(64).nullable().optional().default(null),
});

/** GET /api/admin/amenities — same catalogue as the public endpoint. */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    return apiOk({ data: await listAmenities() });
  } catch (err) {
    logger.error('GET /api/admin/amenities failed', { err });
    return apiServerError();
  }
}

/**
 * POST /api/admin/amenities
 *
 * Slug is derived from the English name once at creation and then immutable —
 * listings reference amenities by slug in filters and URLs.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }
  const parsed = amenityCreateSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const input = parsed.data;

  const slug = slugify(input.name.en);
  if (!slug) return apiBadRequestRaw('Could not derive a slug from the English name');

  try {
    const created = await prisma.amenity.create({
      data: {
        slug,
        category: input.category,
        icon: input.icon,
        name: {
          az: input.name.az || input.name.en,
          ru: input.name.ru || input.name.en,
          en: input.name.en,
        } as Prisma.InputJsonValue,
      },
      select: { id: true, slug: true },
    });
    after(() =>
      recordAdminLog({ action: 'amenity.create', target: created.id, metadata: { slug } }),
    );
    revalidateListingSurfaces();
    return apiOk(created, { status: 201 });
  } catch (err) {
    if (isUniqueConstraintError(err, 'slug')) {
      return apiConflict(`An amenity with slug "${slug}" already exists`);
    }
    logger.error('POST /api/admin/amenities failed', { err });
    return apiServerError('Create failed');
  }
}
