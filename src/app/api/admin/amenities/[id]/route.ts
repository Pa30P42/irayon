import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiConflict,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { localizedTextSchema } from '@/lib/api/localized-text';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { after } from 'next/server';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };

const amenityUpdateSchema = z.object({
  name: localizedTextSchema.optional(),
  category: z.enum(['essentials', 'outdoor', 'kitchen', 'family', 'extras']).optional(),
  icon: z.string().trim().max(64).nullable().optional(),
});

/**
 * PATCH /api/admin/amenities/:id — rename / regroup / re-icon. The slug is
 * intentionally immutable: listings and filter URLs reference it.
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
  const parsed = amenityUpdateSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const input = parsed.data;

  const data: Prisma.AmenityUpdateInput = {};
  if (input.name) {
    data.name = {
      az: input.name.az || input.name.en,
      ru: input.name.ru || input.name.en,
      en: input.name.en,
    } as Prisma.InputJsonValue;
  }
  if (input.category !== undefined) data.category = input.category;
  if (input.icon !== undefined) data.icon = input.icon;

  try {
    const row = await prisma.amenity.update({ where: { id }, data });
    after(() =>
      recordAdminLog({
        actor: auth.user,
        action: 'amenity.update',
        target: id,
        metadata: { slug: row.slug },
      }),
    );
    revalidateListingSurfaces();
    return apiOk({ id: row.id, slug: row.slug });
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025') {
      return apiNotFound(`Amenity "${id}" not found`);
    }
    logger.error(`PATCH /api/admin/amenities/${id} failed`, { err });
    return apiServerError('Update failed');
  }
}

/**
 * DELETE /api/admin/amenities/:id — 409 while listings still reference it,
 * so a filter option can't silently vanish from under live listings.
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
    const amenity = await prisma.amenity.findUnique({
      where: { id },
      select: { slug: true, _count: { select: { listings: true } } },
    });
    if (!amenity) return apiNotFound(`Amenity "${id}" not found`);
    if (amenity._count.listings > 0) {
      return apiConflict('Amenity is used by listings — remove it from them first', {
        listings: [String(amenity._count.listings)],
      });
    }

    await prisma.amenity.delete({ where: { id } });
    after(() =>
      recordAdminLog({
        actor: auth.user,
        action: 'amenity.delete',
        target: id,
        metadata: { slug: amenity.slug },
      }),
    );
    revalidateListingSurfaces();
    return apiOk({ deleted: true });
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025') {
      return apiNotFound(`Amenity "${id}" not found`);
    }
    logger.error(`DELETE /api/admin/amenities/${id} failed`, { err });
    return apiServerError('Delete failed');
  }
}
