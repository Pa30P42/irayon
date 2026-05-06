import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ListingGrid } from '@/components/listings/listing-grid';
import { mockListings } from '@/data/mock-listings';
import type { Locale } from '@/i18n/routing';

type HomePageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  return {
    title: t('heroTitle'),
    description: t('heroSubtitle'),
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const featured = mockListings.slice(0, 6);

  return (
    <>
      <section className="bg-accent">
        <div className="container-wide py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-primary tracking-tight">
            {t('heroTitle')}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto">
            {t('heroSubtitle')}
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/listings">{t('ctaExplore')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-wide py-16">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold">{t('featuredTitle')}</h2>
          <p className="text-foreground-muted mt-2">{t('featuredSubtitle')}</p>
        </div>
        <Suspense fallback={<div className="text-foreground-muted">Loading…</div>}>
          <ListingGrid listings={featured} locale={locale} />
        </Suspense>
      </section>
    </>
  );
}
