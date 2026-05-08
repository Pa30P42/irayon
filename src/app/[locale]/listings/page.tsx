import { ListingsView } from '@/components/listings/listings-view';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { JsonLd } from '@/components/shared/json-ld';
import type { Locale } from '@/i18n/routing';
import { emptyListingsQuery } from '@/lib/api/listings-query-defaults';
import { listListings } from '@/lib/api/listings-service';
import { SITE } from '@/lib/constants';
import { breadcrumbLd, itemListLd } from '@/lib/json-ld';
import { buildMetadata, type SeoLocale } from '@/lib/seo';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

type ListingsPageProps = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CATALOG_TITLES: Record<SeoLocale, string> = {
  az: 'Bütün villalar — Azərbaycanda günlük kirayə',
  ru: 'Все виллы — Аренда посуточно в Азербайджане',
  en: 'All villas — Short-term rentals in Azerbaijan',
};

const CATALOG_DESCRIPTIONS: Record<SeoLocale, string> = {
  az: 'Azərbaycanda günlük villa, bağ evi və kottec kirayəsi. Filtrlər ilə dağ, meşə və çay kənarı evləri tapın.',
  ru: 'Аренда виллы, дачи и коттеджа в Азербайджане посуточно. Используйте фильтры, чтобы найти горы, лес или у реки.',
  en: 'Browse villas, cottages and cabins for rent across Azerbaijan. Filter by region, category, or amenities.',
};

const CATALOG_KEYWORDS: Record<SeoLocale, string[]> = {
  az: ['günlük kirayə', 'bağ evi', 'villa icarəsi', 'həyət evi kirayəsi', 'istirahət evi'],
  ru: ['снять виллу посуточно', 'аренда дачи', 'коттедж Азербайджан', 'домик в аренду'],
  en: ['rent villa Azerbaijan', 'short term rental', 'vacation rental Azerbaijan'],
};

/**
 * Query params that produce a filtered/searched view of the catalog. Their
 * presence means the page should `noindex` (canonical stays at `/listings`),
 * so we don't dilute ranking with thousands of duplicate-content variants.
 *
 * Tracking params (utm_*, ref, fbclid, …) and harmless params like `sort`
 * intentionally NOT in this list — they don't change the result set in a way
 * Google should treat as a different page.
 */
const NOINDEX_FILTER_PARAMS = new Set([
  'q',
  'region',
  'village',
  'category',
  'type',
  'guests',
  'placement',
  'food',
  'extra',
  'basic',
  'amenities',
  'fun',
  'price_min',
  'price_max',
  'capacity',
]);

export async function generateMetadata({
  params,
  searchParams,
}: ListingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const seoLocale = locale as SeoLocale;
  const hasActiveFilters = Object.keys(sp).some((key) => NOINDEX_FILTER_PARAMS.has(key));
  return buildMetadata({
    title: CATALOG_TITLES[seoLocale],
    description: CATALOG_DESCRIPTIONS[seoLocale],
    path: '/listings',
    locale: seoLocale,
    keywords: CATALOG_KEYWORDS[seoLocale],
    index: !hasActiveFilters,
  });
}

export default async function ListingsPage({ params }: ListingsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('listings');

  // Server-side fetch of the full set; <ListingsView> filters/sorts client-side
  // off the URL state. For a small catalog (~100 listings) this is fine; once
  // we cross several hundred, switch to query-driven server fetches.
  const { data: listings, meta } = await listListings(
    emptyListingsQuery({ sort: 'newest', limit: 100 }),
  );

  const base = SITE.url.replace(/\/$/, '');
  const breadcrumbs = breadcrumbLd([
    { name: SITE.name, url: `${base}/${locale}` },
    { name: t('title'), url: `${base}/${locale}/listings` },
  ]);
  const itemList = itemListLd({
    name: CATALOG_TITLES[locale as SeoLocale],
    totalCount: meta.total,
    items: listings.map((l) => ({ url: `${base}/${locale}/listings/${l.slug}` })),
  });

  return (
    <section className="container-wide py-12">
      <Breadcrumb items={[{ name: t('title') }]} />
      <header className="mt-4 mb-8">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
        <p className="text-foreground-muted mt-2">{t('subtitle')}</p>
      </header>
      <Suspense fallback={<div className="text-foreground-muted">Loading…</div>}>
        <ListingsView initialListings={listings} locale={locale} />
      </Suspense>
      <JsonLd data={[breadcrumbs, itemList]} />
    </section>
  );
}
