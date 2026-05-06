import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HeroSection } from '@/components/home/hero-section';
import { CategoryFilterBar } from '@/components/home/category-filter-bar';
import { FeaturedListings } from '@/components/home/featured-listings';
import { MapTeaser } from '@/components/home/map-teaser';
import { RegionsGrid } from '@/components/home/regions-grid';
import { mockListings } from '@/data/mock-listings';
import type { Locale } from '@/i18n/routing';

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
      <Suspense fallback={<div className="container-wide py-12 text-foreground-muted">Loading…</div>}>
        <FeaturedListings initialListings={mockListings} locale={locale} />
      </Suspense>
      <MapTeaser />
      <RegionsGrid />
    </>
  );
}
