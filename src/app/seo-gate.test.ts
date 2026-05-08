import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests the production-domain gate at the route level: robots.ts and
 * sitemap.ts must hibernate (Disallow: / + empty sitemaps) on every host
 * other than the real `irayon.az` domain. SEO code stays in place; it just
 * doesn't surface anything crawlers can act on.
 */

const ORIGINAL_ENV = { ...process.env };

const setSiteUrl = (url: string) => {
  process.env.NEXT_PUBLIC_SITE_URL = url;
  delete process.env.NEXT_PUBLIC_APP_URL;
  vi.resetModules();
};

// Stub the listings service: sitemap imports it transitively, but we don't
// want to spin up Prisma during a unit test. Real DB-backed tests live next
// to the service.
vi.mock('@/lib/api/listings-service', () => ({
  listListings: vi.fn(async () => ({
    data: [{ slug: 'sample', createdAt: new Date().toISOString() }],
    meta: { total: 1, page: 1, limit: 1000, hasMore: false },
  })),
  listRegions: vi.fn(async () => [
    { slug: 'gabala', name: { az: 'a', ru: 'b', en: 'Gabala' }, coverImage: null, listingCount: 0 },
  ]),
}));

beforeEach(() => {
  setSiteUrl('https://irayon.vercel.app');
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('robots.ts gate', () => {
  it('off-prod (vercel.app): single Disallow: / rule, no sitemap reference', async () => {
    const robots = (await import('./robots')).default;
    const result = robots();
    expect(result).toEqual({ rules: [{ userAgent: '*', disallow: '/' }] });
    expect('sitemap' in result).toBe(false);
  });

  it('off-prod (localhost): Disallow: / too', async () => {
    setSiteUrl('http://localhost:3000');
    const robots = (await import('./robots')).default;
    expect(robots()).toEqual({ rules: [{ userAgent: '*', disallow: '/' }] });
  });

  it('on production (irayon.az): emits the real allow/disallow rules + sitemap URL', async () => {
    setSiteUrl('https://irayon.az');
    const robots = (await import('./robots')).default;
    const result = robots();
    expect(result.sitemap).toBe('https://irayon.az/sitemap.xml');
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule?.allow).toBe('/');
    expect(Array.isArray(rule?.disallow) ? rule.disallow : [rule?.disallow]).toEqual(
      expect.arrayContaining(['/admin', '/admin/', '/api', '/api/', '/_next/']),
    );
  });
});

describe('sitemap.ts gate', () => {
  it('off-prod returns an empty array for every segment id', async () => {
    const sitemap = (await import('./sitemap')).default;
    expect(await sitemap({ id: 'static' })).toEqual([]);
    expect(await sitemap({ id: 'listings' })).toEqual([]);
    expect(await sitemap({ id: 'regions' })).toEqual([]);
  });

  it('on production emits real entries for the static segment', async () => {
    setSiteUrl('https://irayon.az');
    const sitemap = (await import('./sitemap')).default;
    const entries = await sitemap({ id: 'static' });
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.url).toMatch(/^https:\/\/irayon\.az\//);
  });
});
