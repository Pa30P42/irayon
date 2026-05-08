import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const setSiteUrl = (url: string) => {
  process.env.NEXT_PUBLIC_SITE_URL = url;
  delete process.env.NEXT_PUBLIC_APP_URL; // remove the legacy fallback so it can't shadow the test env
  vi.resetModules();
};

beforeEach(() => {
  // Default: production-like host so most assertions exercise the "indexed"
  // path. Tests that need the non-prod gate flip this in their own setup.
  setSiteUrl('https://irayon.az');
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const importBuild = async () => (await import('./seo')).buildMetadata;

describe('buildMetadata (production domain)', () => {
  it('emits a canonical that includes the locale and path', async () => {
    const buildMetadata = await importBuild();
    const meta = buildMetadata({
      title: 'Test',
      description: 'desc',
      path: '/listings/foo',
      locale: 'en',
    });
    expect(meta.alternates?.canonical).toBe('https://irayon.az/en/listings/foo');
  });

  it('emits hreflang alternates for every locale plus x-default', async () => {
    const buildMetadata = await importBuild();
    const meta = buildMetadata({
      title: 'T',
      description: 'd',
      path: '/',
      locale: 'ru',
    });
    const langs = meta.alternates?.languages ?? {};
    expect(langs.en).toBe('https://irayon.az/en');
    expect(langs.ru).toBe('https://irayon.az/ru');
    expect(langs.az).toBe('https://irayon.az/az');
    expect(langs['x-default']).toBe('https://irayon.az/az');
  });

  it('canonical for the home matches the sitemap form (no trailing slash)', async () => {
    const buildMetadata = await importBuild();
    const meta = buildMetadata({
      title: 'T',
      description: 'd',
      path: '/',
      locale: 'en',
    });
    expect(meta.alternates?.canonical).toBe('https://irayon.az/en');
  });

  it('maps locale → OG locale code and includes image when provided', async () => {
    const buildMetadata = await importBuild();
    const meta = buildMetadata({
      title: 'T',
      description: 'd',
      path: '/x',
      locale: 'az',
      image: 'https://example.test/cover.jpg',
    });
    expect(meta.openGraph?.locale).toBe('az_AZ');
    expect(
      Array.isArray(meta.openGraph?.images) ? meta.openGraph?.images?.[0] : null,
    ).toMatchObject({ url: 'https://example.test/cover.jpg', width: 1200, height: 630 });
  });

  it('emits index/follow + googleBot robots when the page opts in', async () => {
    const buildMetadata = await importBuild();
    const meta = buildMetadata({
      title: 'T',
      description: 'd',
      path: '/',
      locale: 'en',
    });
    expect(meta.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    });
  });

  it('honors index=false to noindex filtered/search pages', async () => {
    const buildMetadata = await importBuild();
    const meta = buildMetadata({
      title: 'T',
      description: 'd',
      path: '/listings',
      locale: 'en',
      index: false,
    });
    // The production-domain gate AND the per-page opt-out both deny indexing —
    // the resulting robots tag is the strict {index: false, follow: false}.
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it('passes keywords through verbatim', async () => {
    const buildMetadata = await importBuild();
    const meta = buildMetadata({
      title: 'T',
      description: 'd',
      path: '/',
      locale: 'en',
      keywords: ['villa rental Azerbaijan', 'cabin rental'],
    });
    expect(meta.keywords).toEqual(['villa rental Azerbaijan', 'cabin rental']);
  });
});

describe('buildMetadata (non-production domain — vercel.app, localhost, etc.)', () => {
  it('forces noindex even when the page asks to be indexed', async () => {
    setSiteUrl('https://irayon.vercel.app');
    const buildMetadata = await importBuild();
    const meta = buildMetadata({
      title: 'T',
      description: 'd',
      path: '/',
      locale: 'en',
      // Page asks to be indexed; the production-domain gate overrides.
      index: true,
    });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it('treats localhost as non-production', async () => {
    setSiteUrl('http://localhost:3000');
    const buildMetadata = await importBuild();
    const meta = buildMetadata({
      title: 'T',
      description: 'd',
      path: '/',
      locale: 'en',
    });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});
