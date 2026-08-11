import {
  apiBadRequest,
  apiBadRequestRaw,
  apiConflict,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { createReportSchema } from '@/lib/api/messaging-validator';
import { requireSameOrigin, requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/reports — report a listing, a user, or a message.
 *
 * `targetId` is stored WITHOUT a foreign key and without checking the target
 * exists. Both are deliberate: a report must outlive the thing it reports, or
 * archiving a reported listing would erase the evidence. The admin queue is
 * responsible for rendering a vanished target gracefully.
 */
export async function POST(request: Request): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireUser({ force: true });
  if (!auth.ok) return auth.response;

  const rate = await checkRateLimit('hostAction', `report:${auth.user.id}`);
  if (!rate.success) {
    return new Response(JSON.stringify({ error: { message: 'Too many reports' } }), {
      status: 429,
      headers: { 'content-type': 'application/json' },
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }
  const parsed = createReportSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);

  try {
    // One open report per person per target. Re-reporting the same listing ten
    // times is noise in the queue, not ten times the signal.
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: auth.user.id,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        resolvedAt: null,
      },
      select: { id: true },
    });
    if (existing) return apiConflict('already_reported');

    const report = await prisma.report.create({
      data: {
        reporterId: auth.user.id,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        reason: parsed.data.reason,
        note: parsed.data.note ?? null,
      },
      select: { id: true },
    });

    return apiOk(report, { status: 201 });
  } catch (err) {
    logger.error('POST /api/reports failed', { err });
    return apiServerError();
  }
}
