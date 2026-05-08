import { CategoryFilterBar } from '@/components/home/category-filter-bar';
import { FeaturedListings } from '@/components/home/featured-listings';
import { HeroSection } from '@/components/home/hero-section';
import { MapTeaser } from '@/components/home/map-teaser';
import { RegionsGrid } from '@/components/home/regions-grid';
import type { Locale } from '@/i18n/routing';
import { listListings } from '@/lib/api/listings-service';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

type HomePageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.hero' });
  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Fetch a generous batch for the featured grid; FeaturedListings re-filters
  // client-side by category from URL state.
  const { data: listings } = await listListings({
    q: '',
    region: [],
    village: [],
    type: [],
    placement: [],
    food: [],
    extra: [],
    basic: [],
    amenities: [],
    fun: [],
    sort: 'newest',
    page: 1,
    limit: 50,
  });

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
    </>
  );
}
