import { apiOk, apiServerError } from '@/lib/api/api-response';
import { listReports } from '@/lib/api/reports-service';
import { requireAdmin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

/** GET /api/admin/reports?resolved=1 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const includeResolved = new URL(request.url).searchParams.get('resolved') === '1';

  try {
    return apiOk({ data: await listReports(includeResolved) });
  } catch (err) {
    logger.error('GET /api/admin/reports failed', { err });
    return apiServerError();
  }
}
