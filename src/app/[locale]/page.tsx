import { CategoryFilterBar } from '@/components/home/category-filter-bar';
import { FeaturedListings } from '@/components/home/featured-listings';
import { HeroSection } from '@/components/home/hero-section';
import { MapTeaser } from '@/components/home/map-teaser';
import { RegionsGrid } from '@/components/home/regions-grid';
import { mockListings } from '@/data/mock-listings';
import type { Locale } from '@/i18n/routing';
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

  return (
    <>
      <HeroSection />
      <Suspense fallback={null}>
        <CategoryFilterBar />
      </Suspense>
      <Suspense
        fallback={<div className="container-wide text-foreground-muted py-12">Loading…</div>}
      >
        <FeaturedListings initialListings={mockListings} locale={locale} />
      </Suspense>
      <MapTeaser />
      <RegionsGrid />
    </>
  );
}
