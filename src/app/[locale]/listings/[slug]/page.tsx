import { ListingDetailContent } from '@/components/listings/listing-detail-content';
import { routing, type Locale } from '@/i18n/routing';
import { getListingBySlug, listListings } from '@/lib/api/listings-service';
import { SITE } from '@/lib/constants';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

type ListingDetailProps = {
  params: Promise<{ locale: Locale; slug: string }>;
};

const EMPTY_FILTER_QUERY = {
  q: '',
  village: [],
  type: [],
  placement: [],
  food: [],
  extra: [],
  basic: [],
  amenities: [],
  fun: [],
  sort: 'newest' as const,
  page: 1,
  limit: 1000,
};

/**
 * Pre-renders all currently-known slugs at build time. Listings created after
 * a build still render dynamically on first request (Next.js' default
 * `dynamicParams: true`), so the admin doesn't need to trigger redeploys.
 */
export async function generateStaticParams() {
  const { data } = await listListings(EMPTY_FILTER_QUERY);
  return data.flatMap((listing) =>
    routing.locales.map((locale) => ({ locale, slug: listing.slug })),
  );
}

export async function generateMetadata({ params }: ListingDetailProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const listing = await getListingBySlug(slug);
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

  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  // Same-region siblings, server-filtered. Returns up to 5 so we can drop
  // the current listing and still have 4 to display.
  const { data: regionListings } = await listListings({
    ...EMPTY_FILTER_QUERY,
    region: listing.region,
    limit: 5,
  });
  const similar = regionListings.filter((l) => l.id !== listing.id).slice(0, 4);

  return <ListingDetailContent listing={listing} similar={similar} locale={locale} />;
}
