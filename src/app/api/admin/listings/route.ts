import { requireAdmin } from '@/lib/admin-auth';
import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiConflict,
  apiNotFound,
  apiOk,
  apiPaginated,
  apiServerError,
} from '@/lib/api/api-response';
import { createListingSchema, type CreateListingInput } from '@/lib/api/listings-create-validator';
import { listListings } from '@/lib/api/listings-service';
import { listingsQuerySchema, searchParamsToObject } from '@/lib/api/listings-validator';
import {
  toActivity,
  toCategory,
  toListingStatus,
  toMeal,
  toPlaceType,
} from '@/lib/api/prisma-enums';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { isUniqueConstraintError } from '@/lib/prisma-errors';
import { slugify, uniqueSlug } from '@/lib/slug';
import type { Activity, ListingCategory, ListingStatus, Meal, PlaceType } from '@/types';
import type { Prisma } from '@prisma/client';
import { after } from 'next/server';
import { z } from 'zod';

// Status scope is an ADMIN-ONLY parameter: the public /api/listings schema
// deliberately has no `status` key, so unauthenticated callers can never
// widen visibility past published rows.
const adminListingsQuerySchema = listingsQuerySchema.extend({
  status: z.enum(['draft', 'published', 'archived', 'all']).default('all'),
});

/**
 * GET /api/admin/listings
 *
 * Same query surface as the public list plus `status` (default `all`) so the
 * admin catalogue shows drafts and archived listings.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = adminListingsQuerySchema.safeParse(searchParamsToObject(url.searchParams));
  if (!parsed.success) return apiBadRequest(parsed.error);
  const { status, ...query } = parsed.data;

  try {
    const result = await listListings(query, status);
    return apiPaginated(result);
  } catch (err) {
    logger.error('GET /api/admin/listings failed', { err });
    return apiServerError();
  }
}

/**
 * POST /api/admin/listings
 *
 * Body: JSON matching `createListingSchema`. Slug is auto-derived from
 * title.en and disambiguated against existing slugs. Returns the new
 * listing's id + slug so the client can chain image uploads.
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

  const parsed = createListingSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const input: CreateListingInput = parsed.data;

  const baseSlug = slugify(input.title.en);
  if (!baseSlug) return apiServerError('Could not derive a slug from the title');

  // The four pre-insert lookups are independent — fan them out instead of
  // paying four sequential round-trips to the DB.
  const [region, village, existing, amenityRows] = await Promise.all([
    prisma.region.findUnique({ where: { slug: input.region }, select: { id: true } }),
    input.villageId
      ? prisma.village.findUnique({ where: { id: input.villageId }, select: { regionId: true } })
      : Promise.resolve(null),
    // Resolve slug uniqueness — fetch only the slugs sharing the base prefix.
    prisma.listing.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    }),
    input.amenities.length > 0
      ? prisma.amenity.findMany({
          where: { slug: { in: input.amenities } },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
  ]);
  if (!region) return apiNotFound(`Region "${input.region}" not found`);

  // Validate the optional village belongs to the chosen region. Mismatches
  // default to null rather than reject — the form's cascade should already
  // prevent this, so a stale ID just degrades to "no village".
  const villageId =
    input.villageId && village && village.regionId === region.id ? input.villageId : null;

  const slug = uniqueSlug(baseSlug, new Set(existing.map((l) => l.slug)));

  try {
    const created = await prisma.listing.create({
      data: {
        slug,
        title: {
          az: input.title.az || input.title.en,
          ru: input.title.ru || input.title.en,
          en: input.title.en,
        } as Prisma.InputJsonValue,
        description: {
          az: input.description.az || input.description.en,
          ru: input.description.ru || input.description.en,
          en: input.description.en,
        } as Prisma.InputJsonValue,
        regionId: region.id,
        villageId,
        placeType: toPlaceType(input.placeType as PlaceType),
        status: toListingStatus(input.status as ListingStatus),
        categories: { set: (input.categories as ListingCategory[]).map(toCategory) },
        price: input.price,
        capacity: input.capacity,
        bedrooms: input.bedrooms,
        lat: input.lat,
        lng: input.lng,
        address: input.address,
        phone: input.phone,
        meals: (input.meals as Meal[]).map(toMeal),
        activities: (input.activities as Activity[]).map(toActivity),
        ...(amenityRows.length > 0
          ? { amenities: { create: amenityRows.map((a) => ({ amenityId: a.id })) } }
          : {}),
      },
      select: { id: true, slug: true },
    });

    after(() =>
      recordAdminLog({
        action: 'listing.create',
        target: created.id,
        metadata: { slug: created.slug, status: input.status },
      }),
    );
    revalidateListingSurfaces(created.slug);
    return apiOk(created, { status: 201 });
  } catch (err) {
    // The prefix scan resolves slug collisions in the common case; P2002 here
    // means a concurrent create raced us — retryable, not a server fault.
    if (isUniqueConstraintError(err, 'slug')) {
      return apiConflict('A listing with this title was just created — retry to get a new slug');
    }
    logger.error('POST /api/admin/listings failed', { err });
    return apiServerError('Create failed');
  }
}
