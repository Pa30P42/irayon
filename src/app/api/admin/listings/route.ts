import { apiBadRequest, apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { createListingSchema, type CreateListingInput } from '@/lib/api/listings-create-validator';
import { prisma } from '@/lib/prisma';
import { slugify, uniqueSlug } from '@/lib/slug';
import type { Prisma } from '@prisma/client';

const dtoToPrismaEnum = (value: string): string => value.toUpperCase().replace(/-/g, '_');

/**
 * POST /api/admin/listings
 *
 * Body: JSON matching `createListingSchema`. Slug is auto-derived from
 * title.en and disambiguated against existing slugs. Returns the new
 * listing's id + slug so the client can chain image uploads.
 */
export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiServerError('Invalid JSON body');
  }

  const parsed = createListingSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const input: CreateListingInput = parsed.data;

  const region = await prisma.region.findUnique({
    where: { slug: input.region },
    select: { id: true },
  });
  if (!region) return apiNotFound(`Region "${input.region}" not found`);

  // Validate the optional village belongs to the chosen region. Mismatches
  // default to null rather than reject — the form's cascade should already
  // prevent this, so a stale ID just degrades to "no village".
  let villageId: string | null = null;
  if (input.villageId) {
    const village = await prisma.village.findUnique({
      where: { id: input.villageId },
      select: { regionId: true },
    });
    if (village && village.regionId === region.id) {
      villageId = input.villageId;
    }
  }

  const baseSlug = slugify(input.title.en);
  if (!baseSlug) return apiServerError('Could not derive a slug from the title');

  // Resolve uniqueness — fetch only the slugs that share the base prefix.
  const existing = await prisma.listing.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const slug = uniqueSlug(baseSlug, new Set(existing.map((l) => l.slug)));

  const amenityRows =
    input.amenities.length > 0
      ? await prisma.amenity.findMany({
          where: { slug: { in: input.amenities } },
          select: { id: true, slug: true },
        })
      : [];

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
        placeType: dtoToPrismaEnum(input.placeType) as Prisma.ListingCreateInput['placeType'],
        category: dtoToPrismaEnum(input.category) as Prisma.ListingCreateInput['category'],
        price: input.price,
        capacity: input.capacity,
        bedrooms: input.bedrooms,
        lat: input.lat,
        lng: input.lng,
        address: input.address,
        phone: input.phone,
        meals: input.meals.map(dtoToPrismaEnum) as Prisma.ListingCreateInput['meals'],
        activities: input.activities.map(
          dtoToPrismaEnum,
        ) as Prisma.ListingCreateInput['activities'],
        amenities:
          amenityRows.length > 0
            ? { create: amenityRows.map((a) => ({ amenityId: a.id })) }
            : undefined,
      },
      select: { id: true, slug: true },
    });

    return apiOk(created, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/listings failed', err);
    return apiServerError(err instanceof Error ? err.message : 'Create failed');
  }
}
