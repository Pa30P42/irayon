import { recordAdminLog } from '@/lib/admin-log';
import { apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { revokeSessions } from '@/lib/api/user-admin-service';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/users/:id/revoke — sign a user out everywhere, without
 * suspending them. For a suspected stolen token, where the account itself is
 * fine and the person should simply sign in again.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const auth = await requireAdmin(request, { force: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    if (!(await revokeSessions(id))) return apiNotFound('Not found');
    after(() => recordAdminLog({ actor: auth.user, action: 'user.revokeSessions', target: id }));
    return apiOk({ ok: true });
  } catch (err) {
    logger.error(`POST /api/admin/users/${id}/revoke failed`, { err });
    return apiServerError();
  }
}
