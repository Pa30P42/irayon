import { IS_PRODUCTION_DOMAIN, SITE } from '@/lib/constants';
import type { MetadataRoute } from 'next';

const trim = (s: string) => s.replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  // Off-production (vercel.app preview, localhost, custom previews): block
  // every crawler so nothing can be indexed before the real domain is wired
  // up. This is layer 1 of 3 — the sitemap also returns empty and page-level
  // meta says noindex/nofollow on non-prod.
  if (!IS_PRODUCTION_DOMAIN) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  const host = trim(SITE.url);
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Both `/admin` (bare) and `/admin/...` so a spider hitting the bare
        // URL is rejected before it follows any internal links. Same for
        // `/api`.
        disallow: ['/api', '/api/', '/admin', '/admin/', '/_next/'],
      },
    ],
    // `host` intentionally omitted — Yandex-only; Google ignores it,
    // Bing deprecated it.
    sitemap: `${host}/sitemap.xml`,
  };
}
