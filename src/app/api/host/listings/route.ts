import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiConflict,
  apiNotFound,
  apiOk,
  apiPaginated,
  apiServerError,
  apiServiceUnavailable,
} from '@/lib/api/api-response';
import { hostListingSchema, type HostListingInput } from '@/lib/api/host-listing-validator';
import { normalizeCoordinate } from '@/lib/api/listing-moderation';
import { buildListingSearchText } from '@/lib/api/listing-search-text';
import { listListings } from '@/lib/api/listings-service';
import { listingsQuerySchema, searchParamsToObject } from '@/lib/api/listings-validator';
import {
  toActivity,
  toCategory,
  toListingStatus,
  toMeal,
  toPlaceType,
} from '@/lib/api/prisma-enums';
import { requireSameOrigin, requireUser } from '@/lib/auth-helpers';
import { canBecomeHost } from '@/lib/host-signup';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { isUniqueConstraintError } from '@/lib/prisma-errors';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { slugify, uniqueSlug } from '@/lib/slug';
import type { Activity, ListingCategory, ListingStatus, Meal, PlaceType } from '@/types';
import { $Enums, type Prisma } from '@prisma/client';
import { after } from 'next/server';
import { z } from 'zod';

/**
 * A host who has never had a listing approved may keep at most this many in the
 * review queue at once.
 *
 * `listingCreate 5/day/user` is weak on its own: Google accounts are free, so
 * an attacker just makes more of them. This caps what a single throwaway
 * account can do to a human moderator's attention, which is the scarce resource
 * actually being protected.
 */
const MAX_PENDING_FOR_UNPROVEN_HOST = 1;

const hostListingsQuerySchema = listingsQuerySchema.extend({
  status: z.enum(['draft', 'published', 'archived', 'all']).default('all'),
});

/**
 * GET /api/host/listings — the host's OWN listings, in every state.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = hostListingsQuerySchema.safeParse(searchParamsToObject(url.searchParams));
  if (!parsed.success) return apiBadRequest(parsed.error);
  const { status, ...query } = parsed.data;

  try {
    // `hostId` scopes the read to this user; `approvedOnly: false` because the
    // whole point of the cabinet is seeing your pending and rejected listings.
    const result = await listListings(query, {
      status,
      approvedOnly: false,
      hostId: auth.user.id,
    });
    return apiPaginated(result);
  } catch (err) {
    logger.error('GET /api/host/listings failed', { err });
    return apiServerError();
  }
}

/**
 * POST /api/host/listings — create a listing, queued for moderation.
 */
export async function POST(request: Request): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireUser({ force: true });
  if (!auth.ok) return auth.response;

  // The UI hides the CTA for accounts that can't host — but the hidden CTA is
  // cosmetic. This 403 is the gate.
  if (!canBecomeHost(auth.user.email) && !auth.user.becameHostAt) {
    return apiConflict('Host signup is not open for this account');
  }

  const rate = await checkRateLimit('listingCreate', auth.user.id);
  if (!rate.success) {
    return new Response(JSON.stringify({ error: { message: 'Too many listings created today' } }), {
      status: 429,
      headers: { 'content-type': 'application/json', ...rateLimitHeaders(rate) },
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }

  const parsed = hostListingSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);
  const input: HostListingInput = parsed.data;

  const [approvedCount, pendingCount] = await Promise.all([
    prisma.listing.count({
      where: { hostId: auth.user.id, moderationStatus: $Enums.ModerationStatus.APPROVED },
    }),
    prisma.listing.count({
      where: { hostId: auth.user.id, moderationStatus: $Enums.ModerationStatus.PENDING },
    }),
  ]);
  if (approvedCount === 0 && pendingCount >= MAX_PENDING_FOR_UNPROVEN_HOST) {
    return apiConflict(
      'You already have a listing awaiting review. Once it is approved you can add more.',
    );
  }

  const baseSlug = slugify(input.title.en);
  if (!baseSlug) return apiServerError('Could not derive a slug from the title');

  const [region, village, existing, amenityRows] = await Promise.all([
    prisma.region.findUnique({ where: { slug: input.region }, select: { id: true } }),
    input.villageId
      ? prisma.village.findUnique({ where: { id: input.villageId }, select: { regionId: true } })
      : Promise.resolve(null),
    prisma.listing.findMany({ where: { slug: { startsWith: baseSlug } }, select: { slug: true } }),
    input.amenities.length > 0
      ? prisma.amenity.findMany({
          where: { slug: { in: input.amenities } },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
  ]);
  if (!region) return apiNotFound(`Region "${input.region}" not found`);

  const villageId =
    input.villageId && village && village.regionId === region.id ? input.villageId : null;
  const slug = uniqueSlug(baseSlug, new Set(existing.map((l) => l.slug)));

  try {
    const storedTitle = {
      az: input.title.az || input.title.en,
      ru: input.title.ru || input.title.en,
      en: input.title.en,
    };

    const created = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          slug,
          title: storedTitle as Prisma.InputJsonValue,
          searchText: buildListingSearchText(storedTitle, input.address),
          description: {
            az: input.description.az || input.description.en,
            ru: input.description.ru || input.description.en,
            en: input.description.en,
          } as Prisma.InputJsonValue,
          host: { connect: { id: auth.user.id } },
          region: { connect: { id: region.id } },
          ...(villageId ? { village: { connect: { id: villageId } } } : {}),
          placeType: toPlaceType(input.placeType as PlaceType),
          status: toListingStatus(input.status as ListingStatus),
          // Explicit rather than relying on the column default: fail-closed is
          // a property worth stating at every create site, not inferring.
          moderationStatus: $Enums.ModerationStatus.PENDING,
          categories: { set: (input.categories as ListingCategory[]).map(toCategory) },
          price: input.price,
          cleaningFee: input.cleaningFee,
          capacity: input.capacity,
          bedrooms: input.bedrooms,
          // Normalise at the same precision `isSignificantEdit` compares at, so
          // the stored value and the compared value can never diverge.
          lat: normalizeCoordinate(input.lat),
          lng: normalizeCoordinate(input.lng),
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

      // "Host" is a capability, stamped on first create — same transaction, so
      // a user can never end up owning a listing without being a host.
      await tx.user.updateMany({
        where: { id: auth.user.id, becameHostAt: null },
        data: { becameHostAt: new Date() },
      });

      return listing;
    });

    after(() =>
      recordAdminLog({
        actor: auth.user,
        action: 'host.listing.create',
        target: created.id,
        metadata: { slug: created.slug, status: input.status },
      }),
    );
    // NO revalidation: the listing is PENDING and therefore not publicly
    // visible, so there is nothing cached to bust.
    return apiOk(created, { status: 201 });
  } catch (err) {
    if (isUniqueConstraintError(err, 'slug')) {
      return apiConflict('A listing with this title was just created — retry to get a new slug');
    }
    logger.error('POST /api/host/listings failed', { err });
    // Generic message: host-facing errors must not leak Prisma internals.
    if (!process.env.DATABASE_URL) return apiServiceUnavailable('Database is not configured');
    return apiServerError('Create failed');
  }
}
