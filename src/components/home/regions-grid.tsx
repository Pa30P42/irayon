import { Link } from '@/i18n/navigation';
import { listRegions } from '@/lib/api/listings-service';
import { HOME_FEATURED_REGION_LIMIT } from '@/lib/constants';
import { pickLocalized } from '@/lib/utils';
import type { Locale, RegionSummary } from '@/types';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

/** Fallback hero shots for regions that don't have a coverImage in the DB. */
const FALLBACK_REGION_IMAGES: Record<string, string> = {
  gabala:
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=70',
  sheki:
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=70',
  guba: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=70',
  lankaran:
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=70',
  gusar:
    'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=800&q=70',
  gakh: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=800&q=70',
  ismayilli:
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=70',
  goychay:
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=70',
  absheron:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=70',
  lerik:
    'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=800&q=70',
  zagatala:
    'https://images.unsplash.com/photo-1485470733090-0aae1788d5af?auto=format&fit=crop&w=800&q=70',
  shamakhi:
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=70',
  khachmaz:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=70',
};

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=70';

const imageFor = (region: RegionSummary): string =>
  region.coverImage ?? FALLBACK_REGION_IMAGES[region.slug] ?? PLACEHOLDER_IMAGE;

/**
 * Picks regions for the homepage grid. Prefers admin-marked `featured`; if
 * none are featured, falls back to the top N by listing count so the grid
 * is never empty after a fresh deploy.
 */
const pickFeatured = (regions: RegionSummary[]): RegionSummary[] => {
  const featured = regions.filter((r) => r.featured);
  if (featured.length > 0) return featured.slice(0, HOME_FEATURED_REGION_LIMIT);
  return [...regions]
    .sort((a, b) => b.listingCount - a.listingCount)
    .slice(0, HOME_FEATURED_REGION_LIMIT);
};

type RegionsGridProps = {
  locale: Locale;
};

export async function RegionsGrid({ locale }: RegionsGridProps) {
  const t = await getTranslations('home.regions');
  const regions = await listRegions();
  const featured = pickFeatured(regions);

  if (featured.length === 0) return null;

  return (
    <section className="container-wide py-12">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold md:text-3xl">{t('title')}</h2>
        <p className="text-foreground-muted mt-2">{t('subtitle')}</p>
      </header>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {featured.map((region) => {
          const name = pickLocalized(region.name, locale);
          return (
            <li key={region.slug}>
              <Link
                href={`/listings?region=${region.slug}`}
                className="group focus-visible:ring-primary relative block aspect-4/3 overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                aria-label={name}
              >
                <Image
                  src={imageFor(region)}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute right-4 bottom-3 left-4 text-lg font-medium text-white">
                  {name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
