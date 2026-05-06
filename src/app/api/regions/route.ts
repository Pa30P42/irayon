import { apiOk, apiServerError } from '@/lib/api/api-response';
import { listRegions } from '@/lib/api/listings-service';

export async function GET(): Promise<Response> {
  try {
    const regions = await listRegions();
    return apiOk({ data: regions });
  } catch (err) {
    console.error('GET /api/regions failed', err);
    return apiServerError();
  }
}
