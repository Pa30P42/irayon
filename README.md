# iRayon

Villa and cottage rentals across Azerbaijan — built with Next.js 15, React 19, Tailwind v4, next-intl, Prisma.

## Quick start

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

Open <http://localhost:3000> — the middleware redirects to the default locale (`/az`).

## Scripts

| Command             | Purpose                     |
| ------------------- | --------------------------- |
| `npm run dev`       | Next dev server (Turbopack) |
| `npm run build`     | Production build            |
| `npm run start`     | Run production build        |
| `npm run lint`      | ESLint flat config          |
| `npm run format`    | Prettier                    |
| `npm run typecheck` | `tsc --noEmit`              |
| `npm run test`      | Vitest                      |

## Locales

`az` (default), `ru`, `en` — files in `src/i18n/messages/`.

## Project structure

See `src/`:

- `app/[locale]/` — App Router pages with localized routing
- `components/{ui,layout,listings,shared}` — colocated UI
- `hooks/` — custom hooks (filters, listings, locale)
- `lib/` — utils, constants, Prisma client, zod schemas
- `data/` — mock data
- `i18n/` — next-intl routing, navigation, request config
- `types/` — shared types
- `prisma/schema.prisma` — DB schema (no live connection yet)

## Domain & SEO Configuration

The app gates **all** SEO surfaces (robots.txt, sitemap, page-level robots
meta) on the `NEXT_PUBLIC_SITE_URL` env var. Only `https://irayon.az`
unlocks indexing — every other host (vercel.app preview, localhost, custom
domains) is held in a `noindex/Disallow: /` state. SEO metadata, JSON-LD,
hreflang, OG, and Twitter cards are still generated as normal; they're just
flagged as off-limits to crawlers until the production domain is live.

### Production-domain gate

`IS_PRODUCTION_DOMAIN` resolves `NEXT_PUBLIC_SITE_URL` to a hostname and only
returns `true` for `irayon.az` or `www.irayon.az`. Substring lookalikes
(`irayon.az.evil.example`) are rejected. Anything else stays in the
`noindex / Disallow: /` hibernation state — sitemap is empty, page-level
meta is `noindex,nofollow`, and the middleware adds `X-Robots-Tag:
noindex, nofollow, noarchive` on admin / API responses.

### Going-live checklist

When `irayon.az` is connected:

1. Vercel → Project Settings → Environment Variables:
   - **Production**: `NEXT_PUBLIC_SITE_URL = https://irayon.az`
   - **Preview**: leave unset (previews stay non-indexable).
   - **Development**: leave unset; localhost is treated as non-production.
2. (Optional) add search-engine verification tokens in Vercel **Production**
   only — the meta tag is omitted when the env var is empty:
   - `GOOGLE_SITE_VERIFICATION` — from Google Search Console → Settings →
     Ownership verification → HTML tag → the `content="…"` value.
   - `YANDEX_VERIFICATION` — from Yandex Webmaster → Add site → Meta tag.
3. Redeploy the production build.
4. Verify:
   - `https://irayon.az/robots.txt` shows `Allow: /` plus the admin/api
     disallows and the sitemap line — **not** the blanket `Disallow: /`.
   - `https://irayon.az/sitemap.xml` returns the three child sitemaps
     (`?id=static`, `?id=listings`, `?id=regions`) with real URLs.
   - `https://irayon.az/manifest.webmanifest` returns the PWA manifest.
   - View source on the homepage → `<meta name="robots" content="index,follow">`
     and the verification meta tag(s) when tokens are set.
5. Google Search Console:
   - Add property `https://irayon.az` (verification meta tag confirms it).
   - Submit `https://irayon.az/sitemap.xml`.
   - Request indexing for the homepage manually to seed the crawl.
6. Yandex Webmaster: same flow, sitemap URL = `https://irayon.az/sitemap.xml`.

### Why this approach

- Stops Google from indexing the temporary `irayon.vercel.app` URLs, so the
  production domain doesn't launch with duplicate-content baggage.
- No code changes needed at launch — flipping a single env variable
  unlocks the full SEO stack.
- Defense-in-depth: three independent layers (`robots.txt`, page-level
  robots meta, response headers on protected paths) all key off the same
  `IS_PRODUCTION_DOMAIN` constant in [`src/lib/constants.ts`](src/lib/constants.ts).
