import { apiOk, apiServerError } from '@/lib/api/api-response';
import { isUsingMockData } from '@/lib/api/listings-service';
import { requireAdmin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export type AdminCallStats = {
  /** Total call taps in the last 30 days (including deleted listings). */
  total30d: number;
  /** Call taps per listing id over the last 30 days. */
  byListing: Record<string, number>;
};

/**
 * GET /api/admin/calls
 *
 * 30-day call-tap summary for the admin list — the phone tap is this
 * business's only conversion, so it gets first-class visibility.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  if (isUsingMockData()) {
    return apiOk({ total30d: 0, byListing: {} } satisfies AdminCallStats);
  }

  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const grouped = await prisma.callEvent.groupBy({
      by: ['listingId'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    let total30d = 0;
    const byListing: Record<string, number> = {};
    for (const row of grouped) {
      total30d += row._count._all;
      if (row.listingId) byListing[row.listingId] = row._count._all;
    }
    return apiOk({ total30d, byListing } satisfies AdminCallStats);
  } catch (err) {
    logger.error('GET /api/admin/calls failed', { err });
    return apiServerError('Stats fetch failed');
  }
}
