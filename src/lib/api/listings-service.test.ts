import type { Prisma, PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import {
  getListingFromDb,
  getListingFromMock,
  listListingsFromDb,
  listListingsFromMock,
  listRegionsFromDb,
  listRegionsFromMock,
  rowToDto,
} from './listings-service';
import { listingsQuerySchema } from './listings-validator';

// ---------------------------------------------------------------------------
// Mock-data path — exercises the pure in-memory filtering pipeline.
// ---------------------------------------------------------------------------

describe('listListingsFromMock', () => {
  it('returns listings paginated with correct meta', () => {
    const query = listingsQuerySchema.parse({ page: '1', limit: '5' });
    const result = listListingsFromMock(query);
    expect(result.data).toHaveLength(5);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(5);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.total).toBeGreaterThan(5);
  });

  it('filters by direction (CSV)', () => {
    const query = listingsQuerySchema.parse({ direction: 'guba' });
    const result = listListingsFromMock(query);
    expect(result.data.every((l) => l.direction === 'guba')).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('filters by category + region simultaneously', () => {
    const query = listingsQuerySchema.parse({ category: 'forest', region: 'gabala' });
    const result = listListingsFromMock(query);
    expect(result.data.every((l) => l.category === 'forest' && l.region === 'gabala')).toBe(true);
  });

  it('respects price_min / price_max bounds', () => {
    const query = listingsQuerySchema.parse({ price_min: '200', price_max: '400' });
    const result = listListingsFromMock(query);
    expect(result.data.every((l) => l.price >= 200 && l.price <= 400)).toBe(true);
  });

  it('sorts by price-asc when requested', () => {
    const query = listingsQuerySchema.parse({ sort: 'price-asc', limit: '100' });
    const result = listListingsFromMock(query);
    const prices = result.data.map((l) => l.price);
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });
});

describe('getListingFromMock', () => {
  it('returns the listing for a known slug', () => {
    expect(getListingFromMock('gabala-pine-retreat')?.slug).toBe('gabala-pine-retreat');
  });

  it('returns null for an unknown slug', () => {
    expect(getListingFromMock('nope')).toBeNull();
  });
});

describe('listRegionsFromMock', () => {
  it('returns one entry per region used by the mock catalogue', () => {
    const regions = listRegionsFromMock();
    expect(regions.length).toBeGreaterThan(0);
    expect(regions.every((r) => r.listingCount >= 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DB path — uses vitest-mock-extended to verify query construction & mapping.
// ---------------------------------------------------------------------------

type ListingRow = Prisma.ListingGetPayload<{
  include: {
    region: true;
    amenities: { include: { amenity: true } };
    images: { orderBy: { order: 'asc' } };
  };
}>;

const mkRow = (overrides: Partial<ListingRow> = {}): ListingRow =>
  ({
    id: 'lst_db_1',
    slug: 'db-villa',
    title: { az: 'AZ', ru: 'RU', en: 'DB Villa' },
    description: { az: 'd', ru: 'd', en: 'A DB-backed villa' },
    regionId: 'r1',
    region: {
      id: 'r1',
      slug: 'gabala',
      name: { az: 'Q', ru: 'G', en: 'Gabala' },
      coverImage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    direction: 'OTHERS',
    placeType: 'VILLA_COTTAGE',
    category: 'FOREST',
    price: 320,
    rating: 4.9,
    reviewCount: 100,
    capacity: 8,
    bedrooms: 4,
    lat: 40.5,
    lng: 47.5,
    address: 'Vandam',
    phone: '+994500000000',
    meals: ['BREAKFAST'],
    activities: ['HORSE'],
    amenities: [
      {
        listingId: 'lst_db_1',
        amenityId: 'a1',
        amenity: {
          id: 'a1',
          slug: 'wifi',
          icon: null,
          category: 'essentials',
          name: { az: 'Wi-Fi', ru: 'Wi-Fi', en: 'Wi-Fi' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
    images: [
      {
        id: 'i1',
        listingId: 'lst_db_1',
        url: 'https://example.test/1.jpg',
        order: 0,
        alt: null,
        createdAt: new Date(),
      },
      {
        id: 'i2',
        listingId: 'lst_db_1',
        url: 'https://example.test/2.jpg',
        order: 1,
        alt: null,
        createdAt: new Date(),
      },
    ],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  }) as ListingRow;

describe('rowToDto', () => {
  it('maps a Prisma row to a Listing DTO with kebab-case enum values', () => {
    const dto = rowToDto(mkRow());
    expect(dto).toMatchObject({
      slug: 'db-villa',
      region: 'gabala',
      direction: 'others',
      placeType: 'villa-cottage',
      category: 'forest',
      meals: ['breakfast'],
      activities: ['horse'],
      amenities: ['wifi'],
      images: ['https://example.test/1.jpg', 'https://example.test/2.jpg'],
      phone: '+994500000000',
    });
    expect(dto.createdAt).toBe(new Date('2025-01-01T00:00:00.000Z').toISOString());
  });
});

describe('listListingsFromDb', () => {
  let db: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    db = mockDeep<PrismaClient>();
  });

  it('returns mapped data + meta from a single $transaction call', async () => {
    const rows = [mkRow(), mkRow({ id: 'lst_db_2', slug: 'second' })];
    // db.$transaction takes either a callback or an array; here we pass the array.
    db.$transaction.mockResolvedValueOnce([rows, 50] as never);

    const query = listingsQuerySchema.parse({ page: '2', limit: '10' });
    const result = await listListingsFromDb(query, db);

    expect(result.data.map((l) => l.slug)).toEqual(['db-villa', 'second']);
    expect(result.meta).toEqual({
      total: 50,
      page: 2,
      limit: 10,
      hasMore: true,
    });
  });

  it('applies category filter on Prisma (kebab → SCREAMING_SNAKE_CASE)', async () => {
    db.$transaction.mockResolvedValueOnce([[], 0] as never);

    const query = listingsQuerySchema.parse({ category: 'forest' });
    await listListingsFromDb(query, db);

    // The first transaction arg is the array of operations. We want the findMany call.
    const txArgs = db.$transaction.mock.calls[0]?.[0];
    expect(Array.isArray(txArgs)).toBe(true);
    // We can also inspect calls to listing.findMany via mockDeep:
    expect(db.listing.findMany).toHaveBeenCalled();
    const findManyArgs = db.listing.findMany.mock.calls[0]?.[0];
    expect(findManyArgs?.where?.category).toBe('FOREST');
  });

  it('builds a placement filter that maps "water" to RIVER/SEA/LAKE', async () => {
    db.$transaction.mockResolvedValueOnce([[], 0] as never);

    const query = listingsQuerySchema.parse({ placement: 'water' });
    await listListingsFromDb(query, db);

    const findManyArgs = db.listing.findMany.mock.calls[0]?.[0];
    const cat = findManyArgs?.where?.category as { in: string[] };
    expect(cat.in.sort()).toEqual(['LAKE', 'RIVER', 'SEA']);
  });
});

describe('getListingFromDb', () => {
  it('returns null when Prisma reports no row', async () => {
    const db = mockDeep<PrismaClient>();
    db.listing.findUnique.mockResolvedValueOnce(null);
    expect(await getListingFromDb('missing', db)).toBeNull();
  });

  it('returns a mapped DTO for a found row', async () => {
    const db = mockDeep<PrismaClient>();
    db.listing.findUnique.mockResolvedValueOnce(mkRow() as never);
    const result = await getListingFromDb('db-villa', db);
    expect(result?.slug).toBe('db-villa');
    expect(result?.category).toBe('forest');
  });
});

describe('listRegionsFromDb', () => {
  it('maps Prisma rows to RegionSummary with listing counts', async () => {
    const db = mockDeep<PrismaClient>();
    db.region.findMany.mockResolvedValueOnce([
      {
        id: 'r1',
        slug: 'gabala',
        name: { az: 'Q', ru: 'G', en: 'Gabala' },
        coverImage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { listings: 3 },
      },
    ] as never);

    const result = await listRegionsFromDb(db);
    expect(result).toEqual([
      {
        slug: 'gabala',
        name: { az: 'Q', ru: 'G', en: 'Gabala' },
        coverImage: null,
        listingCount: 3,
      },
    ]);
  });
});
