import { describe, expect, it } from 'vitest';
import {
  accommodationLd,
  breadcrumbLd,
  itemListLd,
  organizationLd,
  sanitizeJsonLd,
  websiteLd,
} from './json-ld';

const SITE = { siteUrl: 'https://irayon.test', siteName: 'iRayon' };

describe('sanitizeJsonLd', () => {
  it('escapes < > & so a payload cannot break out of <script>', () => {
    const out = sanitizeJsonLd({ tag: '</script><script>alert(1)</script>', amp: 'A&B' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c/script\\u003e');
    expect(out).toContain('\\u0026');
  });

  it('escapes U+2028 / U+2029 (which break JSON-in-JS literals)', () => {
    // \u2028 is LINE SEPARATOR, \u2029 PARAGRAPH SEPARATOR.
    const out = sanitizeJsonLd({ a: 'foo\u2028bar', b: 'x\u2029y' });
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
    // The actual literal characters must not survive.
    expect(out).not.toContain('\u2028');
    expect(out).not.toContain('\u2029');
  });

  it('still produces parseable JSON when the unicode-escape forms are passed back through JSON.parse', () => {
    // The escape sequences \\u003c are valid JSON escapes — JSON.parse re-creates the literals.
    const original = { tag: '</script>' };
    const out = sanitizeJsonLd(original);
    expect(JSON.parse(out)).toEqual(original);
  });
});

describe('schema builders', () => {
  it('organizationLd has @context, @type, and a square logo URL (not the OG image)', () => {
    const ld = organizationLd(SITE);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('Organization');
    // Google's structured-data guidelines require a square logo, not the
    // 1200×630 opengraph-image used elsewhere.
    expect(ld.logo).toBe('https://irayon.test/logo.svg');
  });

  it('websiteLd embeds a SearchAction targeting /listings', () => {
    const ld = websiteLd(SITE, 'en');
    expect(ld.url).toBe('https://irayon.test/en');
    expect(ld.potentialAction.target).toContain('/en/listings?q={search_term_string}');
  });

  it('breadcrumbLd assigns sequential 1-indexed positions', () => {
    const ld = breadcrumbLd([
      { name: 'Home', url: 'https://x/' },
      { name: 'Listings', url: 'https://x/listings' },
      { name: 'Villa', url: 'https://x/listings/foo' },
    ]);
    expect(ld.itemListElement.map((el) => el.position)).toEqual([1, 2, 3]);
  });

  it('itemListLd caps to 10 items and reports the unfiltered total', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ url: `https://x/${i}` }));
    const ld = itemListLd({ name: 'List', totalCount: 25, items });
    expect(ld.numberOfItems).toBe(25);
    expect(ld.itemListElement).toHaveLength(10);
  });

  it('accommodationLd uses numberOfBedrooms, UnitPriceSpecification, and address split fields', () => {
    const listing = {
      id: 'a',
      slug: 'foo',
      title: { az: 'a', ru: 'b', en: 'Foo' },
      description: { az: 'a', ru: 'b', en: 'Bar' },
      region: 'gabala',
      regionName: { az: 'a', ru: 'b', en: 'Gabala' },
      villageId: null,
      villageName: null,
      direction: 'others' as const,
      placeType: 'villa-cottage' as const,
      category: 'forest' as const,
      price: 250,
      rating: 0,
      reviewCount: 0,
      capacity: 6,
      bedrooms: 3,
      images: ['https://x/1.jpg'],
      amenities: ['wifi', 'ev-charger'] as const,
      meals: [],
      activities: [],
      location: { lat: 40.5, lng: 47.5, address: 'Vandam' },
      phone: '+994',
      createdAt: new Date().toISOString(),
    } as unknown as Parameters<typeof accommodationLd>[0]['listing'];

    const ld = accommodationLd({
      listing,
      locale: 'en',
      canonicalUrl: 'https://x/listings/foo',
      regionName: 'Gabala',
      amenityLabels: { wifi: 'Wi-Fi', 'ev-charger': 'EV charger' },
    });

    // Bedroom count uses the right field per schema.org.
    expect((ld as { numberOfBedrooms: number }).numberOfBedrooms).toBe(3);
    expect('numberOfRooms' in ld).toBe(false);

    // Per-night pricing via UnitPriceSpecification (unitCode=DAY).
    const offers = (ld as { offers: { priceSpecification: Record<string, unknown> } }).offers;
    expect(offers.priceSpecification).toMatchObject({
      '@type': 'UnitPriceSpecification',
      price: 250,
      priceCurrency: 'AZN',
      unitCode: 'DAY',
    });

    // Address: locality (free-form address), region (localized), country.
    const address = (ld as { address: Record<string, unknown> }).address;
    expect(address).toMatchObject({
      addressLocality: 'Vandam',
      addressRegion: 'Gabala',
      addressCountry: 'AZ',
    });

    // Localized amenity names instead of raw slugs.
    const amenities = (ld as { amenityFeature: Array<{ name: string }> }).amenityFeature;
    expect(amenities.map((a) => a.name)).toEqual(['Wi-Fi', 'EV charger']);
  });

  it('accommodationLd falls back to slug when no amenityLabels are provided', () => {
    const listing = {
      title: { en: 'F' },
      description: { en: 'd' },
      region: 'gabala',
      images: [],
      capacity: 4,
      bedrooms: 2,
      price: 100,
      rating: 0,
      reviewCount: 0,
      amenities: ['wifi'] as const,
      location: { lat: 0, lng: 0, address: 'Somewhere' },
    } as unknown as Parameters<typeof accommodationLd>[0]['listing'];

    const ld = accommodationLd({ listing, locale: 'en', canonicalUrl: 'https://x/foo' });
    expect((ld as { amenityFeature: Array<{ name: string }> }).amenityFeature[0]?.name).toBe(
      'wifi',
    );
  });

  it('accommodationLd includes aggregateRating only when reviewed', () => {
    const baseListing = {
      id: 'a',
      slug: 'foo',
      title: { az: 'a', ru: 'b', en: 'Foo' },
      description: { az: 'a', ru: 'b', en: 'Bar' },
      region: 'gabala',
      regionName: { az: 'a', ru: 'b', en: 'Gabala' },
      villageId: null,
      villageName: null,
      direction: 'others' as const,
      placeType: 'villa-cottage' as const,
      category: 'forest' as const,
      price: 250,
      rating: 4.8,
      reviewCount: 12,
      capacity: 6,
      bedrooms: 3,
      images: ['https://x/1.jpg'],
      amenities: ['wifi', 'pool'] as const,
      meals: [],
      activities: [],
      location: { lat: 40.5, lng: 47.5, address: 'Vandam' },
      phone: '+994',
      createdAt: new Date().toISOString(),
    } as unknown as Parameters<typeof accommodationLd>[0]['listing'];

    const withReviews = accommodationLd({
      listing: baseListing,
      locale: 'en',
      canonicalUrl: 'https://x/listings/foo',
    });
    expect(withReviews['aggregateRating']).toMatchObject({
      ratingValue: 4.8,
      reviewCount: 12,
    });
    expect(
      (withReviews as { offers: { priceSpecification: object } }).offers.priceSpecification,
    ).toMatchObject({ price: 250, priceCurrency: 'AZN' });

    // Without reviews — no aggregateRating key.
    const noReviewListing = { ...baseListing, rating: 0, reviewCount: 0 };
    const noReviews = accommodationLd({
      listing: noReviewListing,
      locale: 'en',
      canonicalUrl: 'https://x/listings/foo',
    });
    expect('aggregateRating' in noReviews).toBe(false);
  });
});
