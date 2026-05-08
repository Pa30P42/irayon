import { ListingDetailContent } from '@/components/listings/listing-detail-content';
import { JsonLd } from '@/components/shared/json-ld';
import { routing, type Locale } from '@/i18n/routing';
import { emptyListingsQuery } from '@/lib/api/listings-query-defaults';
import { getListingBySlug, listListings } from '@/lib/api/listings-service';
import { SITE } from '@/lib/constants';
import { accommodationLd, breadcrumbLd } from '@/lib/json-ld';
import { buildMetadata, type SeoLocale } from '@/lib/seo';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

type ListingDetailProps = {
  params: Promise<{ locale: Locale; slug: string }>;
};

/**
 * Pre-renders all currently-known slugs at build time. Listings created after
 * a build still render dynamically on first request (Next.js' default
 * `dynamicParams: true`), so the admin doesn't need to trigger redeploys.
 */
export async function generateStaticParams() {
  const { data } = await listListings(emptyListingsQuery({ sort: 'newest', limit: 1000 }));
  return data.flatMap((listing) =>
    routing.locales.map((locale) => ({ locale, slug: listing.slug })),
  );
}

/**
 * Trim a description for the SERP at the last whitespace before `max` chars
 * — mid-word truncation looks bad ("…cottage among the apple orcha…").
 */
const trimAtWord = (text: string, max = 160): string => {
  if (text.length <= max) return text;
  const cutoff = text.lastIndexOf(' ', max - 3);
  return text.slice(0, cutoff > 0 ? cutoff : max - 3).trimEnd() + '…';
};

export async function generateMetadata({ params }: ListingDetailProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: 'Not found', robots: { index: false, follow: false } };

  const seoLocale = locale as SeoLocale;
  const cover = listing.images[0];

  return buildMetadata({
    title: listing.title[seoLocale],
    description: trimAtWord(listing.description[seoLocale]),
    path: `/listings/${listing.slug}`,
    locale: seoLocale,
    image: cover,
    // `keywords` deliberately omitted: we'd need a per-locale list to avoid
    // shipping English-only keywords on RU/AZ canonicals, and Google ignores
    // the meta-keywords tag anyway. The localized title + JSON-LD already
    // carry the relevant signals.
  });
}

export default async function ListingDetailPage({ params }: ListingDetailProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  // Same-region siblings, server-filtered. Returns up to 5 so we can drop
  // the current listing and still have 4 to display.
  const { data: regionListings } = await listListings(
    emptyListingsQuery({ region: [listing.region], sort: 'newest', limit: 5 }),
  );
  const similar = regionListings.filter((l) => l.id !== listing.id).slice(0, 4);

  const seoLocale = locale as SeoLocale;
  const [t, tAmenity] = await Promise.all([
    getTranslations({ locale, namespace: 'listings' }),
    getTranslations({ locale, namespace: 'amenity' }),
  ]);

  const base = SITE.url.replace(/\/$/, '');
  const canonicalUrl = `${base}/${locale}/listings/${listing.slug}`;
  const breadcrumbs = breadcrumbLd([
    { name: SITE.name, url: `${base}/${locale}` },
    { name: t('title'), url: `${base}/${locale}/listings` },
    { name: listing.title[seoLocale], url: canonicalUrl },
  ]);
  // Localized labels for amenities + region — drives richer SERP rendering of
  // the Accommodation block (instead of raw slugs like "ev-charger").
  const amenityLabels = Object.fromEntries(
    listing.amenities.map((slug) => [slug, tAmenity(slug)] as const),
  );
  const accommodation = accommodationLd({
    listing,
    locale: seoLocale,
    canonicalUrl,
    regionName: listing.regionName[seoLocale],
    amenityLabels,
  });

  return (
    <>
      <ListingDetailContent listing={listing} similar={similar} locale={locale} />
      <JsonLd data={[breadcrumbs, accommodation]} />
    </>
  );
}
