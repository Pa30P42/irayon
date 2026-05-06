import { ListingsView } from '@/components/listings/listings-view';
import { mockListings } from '@/data/mock-listings';
import type { Locale } from '@/i18n/routing';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

type ListingsPageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: ListingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'listings' });
  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function ListingsPage({ params }: ListingsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('listings');

  return (
    <section className="container-wide py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
        <p className="text-foreground-muted mt-2">{t('subtitle')}</p>
      </header>
      <Suspense fallback={<div className="text-foreground-muted">Loading…</div>}>
        <ListingsView initialListings={mockListings} locale={locale} />
      </Suspense>
    </section>
  );
}
