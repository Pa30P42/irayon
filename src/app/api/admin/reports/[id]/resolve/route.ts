import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { resolveReportSchema } from '@/lib/api/messaging-validator';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/reports/:id/resolve
 *
 * Resolvable even when the reported target no longer exists — that is the
 * common case for a message whose booking was cascaded away, and refusing here
 * would leave the queue permanently full of rows nobody can clear.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const auth = await requireAdmin(request, { force: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }
  const parsed = resolveReportSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);

  try {
    const { count } = await prisma.report.updateMany({
      where: { id, resolvedAt: null },
      data: {
        resolvedAt: new Date(),
        resolution: parsed.data.resolution,
        ...(auth.user.breakGlass ? {} : { resolvedById: auth.user.id }),
      },
    });
    if (count === 0) return apiNotFound('Not found or already resolved');

    after(() =>
      recordAdminLog({
        actor: auth.user,
        action: 'report.resolve',
        target: id,
        metadata: { resolution: parsed.data.resolution },
      }),
    );
    return apiOk({ ok: true });
  } catch (err) {
    logger.error(`POST /api/admin/reports/${id}/resolve failed`, { err });
    return apiServerError();
  }
}
