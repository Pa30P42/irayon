import { ListingDetailContent } from '@/components/listings/listing-detail-content';
import { findListingBySlug, mockListings } from '@/data/mock-listings';
import { routing, type Locale } from '@/i18n/routing';
import { SITE } from '@/lib/constants';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

type ListingDetailProps = {
  params: Promise<{ locale: Locale; slug: string }>;
};

export function generateStaticParams() {
  return mockListings.flatMap((listing) =>
    routing.locales.map((locale) => ({ locale, slug: listing.slug })),
  );
}

export async function generateMetadata({ params }: ListingDetailProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const listing = findListingBySlug(slug);
  if (!listing) return { title: 'Not found' };

  const title = listing.title[locale];
  const description = listing.description[locale];
  const cover = listing.images[0];
  const url = `${SITE.url}/${locale}/listings/${listing.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${SITE.url}/${l}/listings/${listing.slug}`]),
      ),
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      locale,
      type: 'website',
      images: cover ? [{ url: cover, width: 1600, height: 1067, alt: title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function ListingDetailPage({ params }: ListingDetailProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const listing = findListingBySlug(slug);
  if (!listing) notFound();

  const similar = mockListings
    .filter((l) => l.region === listing.region && l.id !== listing.id)
    .slice(0, 4);

  return <ListingDetailContent listing={listing} similar={similar} locale={locale} />;
}
