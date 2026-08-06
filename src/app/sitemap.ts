import { routing } from '@/i18n/routing';
import { listListingSlugs, listRegions } from '@/lib/api/listings-service';
import { IS_PRODUCTION_DOMAIN, SITE } from '@/lib/constants';
import type { MetadataRoute } from 'next';

type SitemapId = 'static' | 'listings' | 'regions';

/**
 * Splits the sitemap into three groups so Search Console reports them
 * independently — easier to spot a broken segment than one giant file.
 */
export async function generateSitemaps(): Promise<{ id: SitemapId }[]> {
  return [{ id: 'static' }, { id: 'listings' }, { id: 'regions' }];
}

const trim = (s: string) => s.replace(/\/$/, '');

/** Builds the URL list for the given sitemap segment. */
export default async function sitemap({ id }: { id: SitemapId }): Promise<MetadataRoute.Sitemap> {
  // Off-production domains return empty sitemaps so search engines have
  // nothing to crawl on the temporary vercel.app deploy. Pairs with
  // robots.ts's blanket Disallow.
  if (!IS_PRODUCTION_DOMAIN) return [];

  const base = trim(SITE.url);
  const locales = routing.locales;

  if (id === 'static') {
    const now = new Date();
    return [
      ...locales.map((locale) => ({
        url: `${base}/${locale}`,
        lastModified: now,
        priority: 1.0,
      })),
      ...locales.map((locale) => ({
        url: `${base}/${locale}/listings`,
        lastModified: now,
        priority: 0.9,
      })),
    ];
  }

  if (id === 'listings') {
    // Slug-only feed (published rows only) — the sitemap never needed 1000
    // fully-hydrated listings. Split into batches (per Google's 50k cap)
    // once the catalog grows past ~5k.
    const slugs = await listListingSlugs();
    return slugs.flatMap((listing) =>
      locales.map((locale) => ({
        url: `${base}/${locale}/listings/${listing.slug}`,
        // CRITICAL: real updatedAt drives Google's recrawl scheduling. We
        // serialize createdAt; if updatedAt is exposed later, swap to that
        // without changing this shape.
        lastModified: listing.createdAt,
        priority: 0.8,
      })),
    );
  }

  if (id === 'regions') {
    const regions = await listRegions();
    return regions.flatMap((region) =>
      locales.map((locale) => ({
        url: `${base}/${locale}/regions/${region.slug}`,
        lastModified: new Date(),
        priority: 0.7,
      })),
    );
  }

  return [];
}
