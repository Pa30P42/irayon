import { requireAdmin } from '@/lib/admin-auth';
import { apiBadRequest, apiPaginated, apiServerError } from '@/lib/api/api-response';
import { isUsingMockData } from '@/lib/api/listings-service';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const logsQuerySchema = z.object({
  /** Action prefix filter, e.g. `listing.` or the exact `region.delete`. */
  action: z.string().trim().max(64).optional(),
  /** Exact target (row id / path) filter. */
  target: z.string().trim().max(128).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type AdminLogEntry = {
  id: string;
  action: string;
  target: string | null;
  metadata: unknown;
  createdAt: string;
};

/**
 * GET /api/admin/logs
 *
 * The audit trail that every mutation writes (`recordAdminLog`) — finally
 * readable. Newest first, filterable by action prefix and target.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = logsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return apiBadRequest(parsed.error);
  const { action, target, page, limit } = parsed.data;

  if (isUsingMockData()) {
    return apiPaginated<AdminLogEntry>({
      data: [],
      meta: { total: 0, page, limit, hasMore: false },
    });
  }

  try {
    const where = {
      ...(action ? { action: { startsWith: action } } : {}),
      ...(target ? { target } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.adminLog.count({ where }),
    ]);
    return apiPaginated<AdminLogEntry>({
      data: rows.map((r) => ({
        id: r.id,
        action: r.action,
        target: r.target,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: { total, page, limit, hasMore: page * limit < total },
    });
  } catch (err) {
    logger.error('GET /api/admin/logs failed', { err });
    return apiServerError('Logs fetch failed');
  }
}
