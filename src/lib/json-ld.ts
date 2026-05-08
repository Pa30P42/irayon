import type { Listing } from '@/types';

/**
 * Escapes characters that would let a `</script>` tag (or HTML control chars)
 * break out of a `<script type="application/ld+json">` block. Use this on any
 * server-rendered JSON-LD payload before injecting it into the DOM.
 */
export function sanitizeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

type SiteContext = {
  siteUrl: string;
  siteName: string;
};

export function organizationLd({ siteUrl, siteName }: SiteContext) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    // Square brand mark in /public — Google's structured-data guidelines call
    // for a square logo here, not the 1200×630 OG image.
    logo: `${siteUrl}/logo.svg`,
  };
}

export function websiteLd({ siteUrl, siteName }: SiteContext, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: `${siteUrl}/${locale}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/${locale}/listings?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export type Crumb = { name: string; url: string };

export function breadcrumbLd(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export type AccommodationLdInput = {
  listing: Listing;
  locale: 'az' | 'ru' | 'en';
  canonicalUrl: string;
  /**
   * Localized region name (e.g. "Qəbələ" / "Габала" / "Gabala"). Used as the
   * province-level field (`addressRegion`). Falls back to the slug when absent.
   */
  regionName?: string;
  /**
   * Optional slug → localized label map for amenities. Without it,
   * `amenityFeature.name` falls back to the slug, which is poor for SERP
   * rich-result rendering.
   */
  amenityLabels?: Record<string, string>;
};

export function accommodationLd({
  listing,
  locale,
  canonicalUrl,
  regionName,
  amenityLabels,
}: AccommodationLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Accommodation',
    name: listing.title[locale],
    description: listing.description[locale],
    url: canonicalUrl,
    image: listing.images,
    // schema.org: numberOfRooms = ALL rooms; numberOfBedrooms is the right
    // field for sleeping rooms.
    numberOfBedrooms: listing.bedrooms,
    occupancy: {
      '@type': 'QuantitativeValue',
      maxValue: listing.capacity,
    },
    address: {
      '@type': 'PostalAddress',
      // `address` is a free-form locality string ("Vandam, Gabala") — most
      // accurate as addressLocality. Region (province) goes in addressRegion.
      addressLocality: listing.location.address,
      addressRegion: regionName ?? listing.region,
      addressCountry: 'AZ',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: listing.location.lat,
      longitude: listing.location.lng,
    },
    amenityFeature: listing.amenities.map((slug) => ({
      '@type': 'LocationFeatureSpecification',
      name: amenityLabels?.[slug] ?? slug,
      value: true,
    })),
    offers: {
      '@type': 'Offer',
      // Per-night pricing requires UnitPriceSpecification with unitCode=DAY,
      // otherwise Google interprets `price` as a flat one-time charge.
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: listing.price,
        priceCurrency: 'AZN',
        unitCode: 'DAY',
      },
      availability: 'https://schema.org/InStock',
    },
    ...(listing.rating > 0 && listing.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: listing.rating,
            reviewCount: listing.reviewCount,
          },
        }
      : {}),
  };
}

export type ItemListLdInput = {
  name: string;
  totalCount: number;
  items: Array<{ url: string }>;
};

export function itemListLd({ name, totalCount, items }: ItemListLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: totalCount,
    itemListElement: items.slice(0, 10).map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: it.url,
    })),
  };
}
