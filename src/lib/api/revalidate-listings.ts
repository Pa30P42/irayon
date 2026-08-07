import { routing } from '@/i18n/routing';
import { revalidatePath } from 'next/cache';

/**
 * Busts every cached surface that renders public listing data. Call after ANY
 * admin write that changes what the public site should show: listing
 * create/update/delete, status flips, image add/remove, and region/village
 * CRUD (region names render on cards, detail pages, and the homepage grid).
 *
 * Kept in one place so per-route lists can't drift apart. Before this module
 * existed nothing revalidated at all — the operator's changes were invisible
 * until the next deploy.
 *
 * Pass `slug` whenever the caller knows which listing changed: only that
 * listing's detail pages are then invalidated. Without it we bust the whole
 * `/[locale]/listings/[slug]` route — every prerendered detail page in every
 * locale — which is right for region/village renames but too broad for a
 * routine single-listing edit.
 */
export function revalidateListingSurfaces(slug?: string) {
  // Aggregate surfaces: content depends on the listing set as a whole.
  revalidatePath('/[locale]', 'page'); // home: featured grid, map teaser, region counts
  revalidatePath('/[locale]/listings', 'page'); // catalogue SSR seed
  revalidatePath('/[locale]/regions/[slug]', 'page'); // region pages
  revalidatePath('/sitemap/listings.xml');
  revalidatePath('/sitemap/regions.xml');

  if (slug) {
    for (const locale of routing.locales) {
      revalidatePath(`/${locale}/listings/${slug}`);
    }
  } else {
    revalidatePath('/[locale]/listings/[slug]', 'page');
  }

  // The grid/hooks fetch these handlers directly. They render dynamically
  // (they read the request URL) so no route cache exists — but they set
  // `Cache-Control: s-maxage=…`, an independent CDN cache these calls purge.
  revalidatePath('/api/listings');
  revalidatePath('/api/regions');
}
