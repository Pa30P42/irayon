import {
  CACHE_PUBLIC_LIST,
  apiBadRequest,
  apiNotFound,
  apiOkCached,
  apiServerError,
} from '@/lib/api/api-response';
import { availabilityQuerySchema } from '@/lib/api/booking-validator';
import { getUnavailableRanges } from '@/lib/api/bookings-service';
import { publicListingWhere } from '@/lib/api/listings-service';
import { fromDateOnly, toDateOnly, todayInBakuDateOnly } from '@/lib/dates-baku';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

type Context = { params: Promise<{ slug: string }> };

/** Longest window a single request may ask for. */
const MAX_WINDOW_MONTHS = 12;

const addMonths = (date: Date, months: number): Date => {
  const { year, month, day } = fromDateOnly(date);
  return toDateOnly({ year, month: month + months, day });
};

/**
 * GET /api/listings/:slug/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Merged unavailable ranges: accepted bookings ∪ host blocks. Fetched by the
 * client when the calendar opens, so the listing detail page itself stays on
 * ISR — availability changes far more often than listing content, and baking it
 * into the prerendered page would either serve stale dates or take the whole
 * catalogue off the CDN.
 *
 * A 60s CDN cache is a deliberate trade: a guest may briefly see a date that
 * was taken seconds ago, and will then be refused at request time by the
 * exclusion constraint. Showing a stale date costs one bounced request;
 * bypassing the cache costs a database round-trip on every calendar open.
 */
export async function GET(request: Request, { params }: Context): Promise<Response> {
  const { slug } = await params;
  const url = new URL(request.url);

  const parsed = availabilityQuerySchema.safeParse({
    ...(url.searchParams.get('from') ? { from: url.searchParams.get('from') } : {}),
    ...(url.searchParams.get('to') ? { to: url.searchParams.get('to') } : {}),
  });
  if (!parsed.success) return apiBadRequest(parsed.error);

  const from = parsed.data.from ?? todayInBakuDateOnly();
  const requestedTo = parsed.data.to ?? addMonths(from, MAX_WINDOW_MONTHS);
  // Clamp rather than reject: an over-long window is a client bug, not an
  // attack, and silently narrowing it still returns useful data.
  const maxTo = addMonths(from, MAX_WINDOW_MONTHS);
  const to = requestedTo.getTime() > maxTo.getTime() ? maxTo : requestedTo;

  if (to.getTime() <= from.getTime()) {
    return apiOkCached({ data: [] }, CACHE_PUBLIC_LIST);
  }

  try {
    // Only publicly visible listings expose availability — otherwise this
    // endpoint would confirm the existence of unapproved or draft listings.
    const listing = await prisma.listing.findFirst({
      where: { slug, ...publicListingWhere },
      select: { id: true },
    });
    if (!listing) return apiNotFound('Not found');

    const ranges = await getUnavailableRanges(listing.id, { start: from, end: to });

    return apiOkCached(
      {
        data: ranges.map((range) => ({
          start: range.start.toISOString().slice(0, 10),
          end: range.end.toISOString().slice(0, 10),
        })),
        meta: {
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
        },
      },
      'public, s-maxage=60, stale-while-revalidate=120',
    );
  } catch (err) {
    logger.error(`GET /api/listings/${slug}/availability failed`, { err });
    return apiServerError();
  }
}
