import { apiNotFound, apiOk, apiServerError } from '@/lib/api/api-response';
import { getListingBySlug } from '@/lib/api/listings-service';

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { slug } = await params;

  try {
    const listing = await getListingBySlug(slug);
    if (!listing) return apiNotFound(`Listing "${slug}" not found`);
    return apiOk(listing);
  } catch (err) {
    console.error(`GET /api/listings/${slug} failed`, err);
    return apiServerError();
  }
}
