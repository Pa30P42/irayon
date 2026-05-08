import { ListingGrid } from '@/components/listings/listing-grid';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { JsonLd } from '@/components/shared/json-ld';
import { routing, type Locale } from '@/i18n/routing';
import { emptyListingsQuery } from '@/lib/api/listings-query-defaults';
import { listListings, listRegions } from '@/lib/api/listings-service';
import { SITE } from '@/lib/constants';
import { breadcrumbLd, itemListLd } from '@/lib/json-ld';
import { REGION_KEYWORDS } from '@/lib/region-keywords';
import { buildMetadata, type SeoLocale } from '@/lib/seo';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';

type RegionPageProps = {
  params: Promise<{ locale: Locale; slug: string }>;
};

/**
 * `listRegions()` is invoked from generateStaticParams, generateMetadata, and
 * the page body. React's request-scoped `cache` collapses these to a single
 * DB roundtrip per request.
 */
const cachedListRegions = cache(listRegions);

export async function generateStaticParams() {
  const regions = await cachedListRegions();
  return regions.flatMap((region) =>
    routing.locales.map((locale) => ({ locale, slug: region.slug })),
  );
}

const titlesByLocale = (regionName: string): Record<SeoLocale, string> => ({
  az: `${regionName}da villa və bağ evi kirayəsi — iRayon`,
  ru: `Аренда виллы и дома в ${regionName} — iRayon`,
  en: `Villa & nature rentals in ${regionName} — iRayon`,
});

const descriptionsByLocale = (regionName: string): Record<SeoLocale, string> => ({
  az: `${regionName} regionunda günlük villa, bağ evi və istirahət evi kirayəsi. Dağ, meşə və çay kənarı evlər.`,
  ru: `Аренда виллы, дачи и домика на природе в регионе ${regionName} посуточно. Горы, лес, у реки.`,
  en: `Rent a villa, cottage or nature cabin in ${regionName}, Azerbaijan. Mountains, forests, riverside.`,
});

export async function generateMetadata({ params }: RegionPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const regions = await cachedListRegions();
  const region = regions.find((r) => r.slug === slug);
  if (!region) return { title: 'Region not found' };

  const regionName = region.name[locale] ?? slug;
  return buildMetadata({
    title: titlesByLocale(regionName)[locale],
    description: descriptionsByLocale(regionName)[locale],
    path: `/regions/${slug}`,
    locale: locale as SeoLocale,
    keywords: REGION_KEYWORDS[slug]?.[locale as SeoLocale],
  });
}

export default async function RegionLandingPage({ params }: RegionPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [regions, t] = await Promise.all([cachedListRegions(), getTranslations('listings')]);
  const region = regions.find((r) => r.slug === slug);
  if (!region) notFound();

  const regionName = region.name[locale] ?? slug;
  const { data: listings, meta } = await listListings(
    emptyListingsQuery({ region: [slug], sort: 'newest', limit: 60 }),
  );

  const base = SITE.url.replace(/\/$/, '');
  const canonical = `${base}/${locale}/regions/${slug}`;
  const breadcrumbs = breadcrumbLd([
    { name: SITE.name, url: `${base}/${locale}` },
    { name: t('title'), url: `${base}/${locale}/listings` },
    { name: regionName, url: canonical },
  ]);
  const itemList = itemListLd({
    name: titlesByLocale(regionName)[locale as SeoLocale],
    totalCount: meta.total,
    items: listings.map((l) => ({ url: `${base}/${locale}/listings/${l.slug}` })),
  });

  return (
    <section className="container-wide py-12">
      <Breadcrumb items={[{ name: t('title'), href: '/listings' }, { name: regionName }]} />
      <header className="mt-4 mb-8 space-y-2">
        <h1 className="text-3xl font-semibold md:text-4xl">
          {titlesByLocale(regionName)[locale as SeoLocale]}
        </h1>
        <p className="text-foreground-muted max-w-2xl">
          {descriptionsByLocale(regionName)[locale as SeoLocale]}
        </p>
      </header>

      {listings.length === 0 ? (
        <p className="text-foreground-muted py-12 text-center">{t('noResults')}</p>
      ) : (
        <ListingGrid listings={listings} locale={locale} />
      )}

      <JsonLd data={[breadcrumbs, itemList]} />
    </section>
  );
}
