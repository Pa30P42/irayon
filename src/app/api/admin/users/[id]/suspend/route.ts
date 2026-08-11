import { recordAdminLog } from '@/lib/admin-log';
import { apiConflict, apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { suspendUser, unsuspendUser } from '@/lib/api/user-admin-service';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string }> };

/**
 * POST — suspend. Ends every live session immediately (sessionVersion bump)
 * AND blocks re-authentication, because the Auth.js `signIn` callback rejects a
 * suspended row. Without that second half, the user would simply sign in again
 * with Google and get a fresh valid token.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const auth = await requireAdmin(request, { force: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const result = await suspendUser(id);
    if (!result) return apiConflict('cannot_suspend');

    after(() => recordAdminLog({ actor: auth.user, action: 'user.suspend', target: id }));
    return apiOk({ suspendedAt: result.suspendedAt.toISOString() });
  } catch (err) {
    logger.error(`POST /api/admin/users/${id}/suspend failed`, { err });
    return apiServerError();
  }
}

/** DELETE — lift a suspension. */
export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const auth = await requireAdmin(request, { force: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    if (!(await unsuspendUser(id))) return apiNotFound('Not found');
    after(() => recordAdminLog({ actor: auth.user, action: 'user.unsuspend', target: id }));
    return apiOk({ ok: true });
  } catch (err) {
    logger.error(`DELETE /api/admin/users/${id}/suspend failed`, { err });
    return apiServerError();
  }
}
