import { routing } from '@/i18n/routing';
import { IS_PRODUCTION_DOMAIN, SITE } from '@/lib/constants';
import type { Metadata } from 'next';

export type SeoLocale = 'az' | 'ru' | 'en';

const OG_LOCALE: Record<SeoLocale, string> = {
  az: 'az_AZ',
  ru: 'ru_RU',
  en: 'en_US',
};

export type BuildMetadataInput = {
  /** Final, locale-specific page title — wrapped by the metadataBase template. */
  title: string;
  /** Plain-text description, ≤ 160 chars recommended. */
  description: string;
  /** Path WITHOUT the locale segment, e.g. "/", "/listings", "/listings/foo". */
  path: string;
  locale: SeoLocale;
  /** Optional cover image URL (absolute). Falls back to the default OG image. */
  image?: string;
  keywords?: string[];
  /** Set to `false` to add `noindex` (e.g. filtered search results). */
  index?: boolean;
};

const trimSlash = (s: string): string => s.replace(/\/$/, '');

/**
 * Joins base + path and strips any trailing slash from the result. This keeps
 * the bare-locale URL (`{base}/{locale}` from `path === '/'`) consistent with
 * the sitemap, which also emits the no-trailing-slash form. We never want
 * `https://…/en/` to be canonical for the home; it should be `https://…/en`.
 */
const joinPath = (a: string, b: string): string => {
  const withSlash = b.startsWith('/') ? b : `/${b}`;
  return trimSlash(`${trimSlash(a)}${withSlash}`);
};

/**
 * Centralized metadata builder so every public page emits consistent canonical,
 * hreflang, OG, Twitter, and robots tags. Always pass an `image` URL when you
 * have one (cover photo); the route-level `opengraph-image.tsx` becomes the
 * fallback otherwise.
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const { title, description, path, locale, image, keywords, index = true } = input;
  const base = trimSlash(SITE.url);
  const url = joinPath(base, `/${locale}${path}`);

  const languages: Record<string, string> = {
    'x-default': joinPath(base, `/${routing.defaultLocale}${path}`),
  };
  for (const loc of routing.locales) {
    languages[loc] = joinPath(base, `/${loc}${path}`);
  }

  return {
    metadataBase: new URL(base),
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      locale: OG_LOCALE[locale],
      type: 'website',
      images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
    // Layer 3 of the production-domain SEO gate: even if a page asks to be
    // indexed (`index: true`), we hard-stop on non-production hosts so the
    // temporary vercel.app deploy stays out of search indexes. Page-level
    // `index: false` (e.g. filtered listings) still wins on production.
    robots:
      IS_PRODUCTION_DOMAIN && index
        ? { index: true, follow: true, googleBot: { index: true, follow: true } }
        : { index: false, follow: false },
  };
}
