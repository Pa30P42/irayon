import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Pragmatic CSP baseline. `'unsafe-inline'` on script/style stays for now —
// Next.js' App Router still emits inline runtime scripts and Tailwind injects
// inline styles. Tighten with per-request nonces once we're ready to wire them
// through `headers()` and every `<script>` we render.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://*.basemaps.cartocdn.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Block powerful features by default; the listing form requests geolocation,
  // which we allow for the same origin only.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  // HSTS — Vercel sets this on its domains, but owning it here covers custom
  // domains too. 2 years + preload is the recommended baseline.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Supabase Storage public bucket — hostname is `<project-ref>.supabase.co`.
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
  // `sharp` is a native addon (server-side EXIF strip + re-encode in
  // `src/lib/storage.ts`). Bundling it breaks the .node binary resolution, so
  // keep it external and let Node require it at runtime.
  serverExternalPackages: ['sharp'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
