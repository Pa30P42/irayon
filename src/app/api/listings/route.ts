import { NextResponse } from 'next/server';
import { mockListings } from '@/data/mock-listings';
import { listingFiltersSchema } from '@/lib/validations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsed = listingFiltersSchema.safeParse({
    category: searchParams.get('category') ?? undefined,
    region: searchParams.get('region') ?? undefined,
    minPrice: searchParams.get('minPrice') ?? undefined,
    maxPrice: searchParams.get('maxPrice') ?? undefined,
    capacity: searchParams.get('capacity') ?? undefined,
    amenities: searchParams.getAll('amenities'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const f = parsed.data;
  const results = mockListings.filter((l) => {
    if (f.category && l.category !== f.category) return false;
    if (f.region && l.region !== f.region) return false;
    if (f.minPrice !== undefined && l.price < f.minPrice) return false;
    if (f.maxPrice !== undefined && l.price > f.maxPrice) return false;
    if (f.capacity !== undefined && l.capacity < f.capacity) return false;
    if (f.amenities && f.amenities.length > 0) {
      const has = f.amenities.every((a) => (l.amenities as string[]).includes(a));
      if (!has) return false;
    }
    return true;
  });

  return NextResponse.json({ data: results, total: results.length });
}
