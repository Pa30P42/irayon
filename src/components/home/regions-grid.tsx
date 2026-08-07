import { Heading } from '@/components/ui/typography';
import { Link } from '@/i18n/navigation';
import { listRegions } from '@/lib/api/listings-service';
import { HOME_FEATURED_REGION_LIMIT } from '@/lib/constants';
import { pickLocalized } from '@/lib/utils';
import type { Locale, RegionSummary } from '@/types';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

// No more hardcoded stock-photo fallbacks: covers are admin-managed
// (upload in /admin/regions). Cover-less regions render a brand gradient.
const imageFor = (region: RegionSummary): string | null => region.coverImage;

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
        <Heading level="section">{t('title')}</Heading>
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
                {imageFor(region) ? (
                  <Image
                    src={imageFor(region)!}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="from-primary/70 to-primary/30 absolute inset-0 bg-linear-to-br" />
                )}
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
