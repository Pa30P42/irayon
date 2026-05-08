import { CategoryFilterBar } from '@/components/home/category-filter-bar';
import { FeaturedListings } from '@/components/home/featured-listings';
import { HeroSection } from '@/components/home/hero-section';
import { MapTeaser } from '@/components/home/map-teaser';
import { RegionsGrid } from '@/components/home/regions-grid';
import { JsonLd } from '@/components/shared/json-ld';
import type { Locale } from '@/i18n/routing';
import { emptyListingsQuery } from '@/lib/api/listings-query-defaults';
import { listListings } from '@/lib/api/listings-service';
import { SITE } from '@/lib/constants';
import { organizationLd, websiteLd } from '@/lib/json-ld';
import { buildMetadata, type SeoLocale } from '@/lib/seo';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

type HomePageProps = {
  params: Promise<{ locale: Locale }>;
};

const HOME_TITLES: Record<SeoLocale, string> = {
  az: 'Villa kirayəsi — Azərbaycanda təbiətdə istirahət',
  ru: 'Аренда виллы — Отдых на природе в Азербайджане',
  en: 'Villa Rental — Nature Retreats in Azerbaijan',
};

const HOME_DESCRIPTIONS: Record<SeoLocale, string> = {
  az: 'Azərbaycanda günlük villa, bağ evi və istirahət evi kirayəsi. Dağ, meşə, çay kənarı evlər.',
  ru: 'Аренда виллы и домика на природе в Азербайджане посуточно. Горы, лес, у реки.',
  en: 'Rent a villa or nature cabin in Azerbaijan by the night. Mountains, forests, riverside.',
};

const HOME_KEYWORDS: Record<SeoLocale, string[]> = {
  az: [
    'villa kirayəsi',
    'günlük kirayə evlər',
    'istirahət evi',
    'bağ evi kirayəsi',
    'təbiətdə istirahət',
    'Azərbaycanda istirahət',
  ],
  ru: [
    'аренда виллы Азербайджан',
    'снять дачу Азербайджан',
    'отдых на природе',
    'коттедж аренда',
    'домик на природе',
  ],
  en: [
    'villa rental Azerbaijan',
    'nature retreat Azerbaijan',
    'holiday home Azerbaijan',
    'cabin rental Azerbaijan',
  ],
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const seoLocale = locale as SeoLocale;
  return buildMetadata({
    title: HOME_TITLES[seoLocale],
    description: HOME_DESCRIPTIONS[seoLocale],
    path: '/',
    locale: seoLocale,
    keywords: HOME_KEYWORDS[seoLocale],
  });
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Fetch a generous batch for the featured grid; FeaturedListings re-filters
  // client-side by category from URL state.
  const { data: listings } = await listListings(emptyListingsQuery({ sort: 'newest', limit: 50 }));

  return (
    <>
      <HeroSection />
      <Suspense fallback={null}>
        <CategoryFilterBar />
      </Suspense>
      <Suspense
        fallback={<div className="container-wide text-foreground-muted py-12">Loading…</div>}
      >
        <FeaturedListings initialListings={listings} locale={locale} />
      </Suspense>
      <MapTeaser listings={listings} locale={locale} />
      <RegionsGrid locale={locale} />
      <JsonLd
        data={[
          organizationLd({ siteUrl: SITE.url, siteName: SITE.name }),
          websiteLd({ siteUrl: SITE.url, siteName: SITE.name }, locale),
        ]}
      />
    </>
  );
}
