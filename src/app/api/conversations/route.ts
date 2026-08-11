import { apiOk, apiServerError } from '@/lib/api/api-response';
import { listConversationsForUser } from '@/lib/api/conversations-service';
import { requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

/** GET /api/conversations — every thread this user is part of. */
export async function GET(): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    return apiOk({ data: await listConversationsForUser(auth.user.id) });
  } catch (err) {
    logger.error('GET /api/conversations failed', { err });
    return apiServerError();
  }
}
