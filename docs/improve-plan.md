# iRayon improvement plan — audit-backed, phased

Goal: **every interaction feels instant, the admin workflow actually works, and the
half-built features get finished.** This is the iRayon adaptation of the playbook
already executed on the sibling project `emlak-uz` (see its `docs/speed-up-plan.md`
and the `improvement/speed-up` branch there for reference implementations of every
pattern named below).

**Product framing (decided 2026-08-06):** iRayon stays a _curated catalogue_ — one
admin operator manages all listings. No public user accounts, no owner cabinet, no
marketplace features. Region decision: **DB stays in Tokyo; pin Vercel functions to
`hnd1`.**

**Discipline for the executing session:**

- Every claim below was verified against the code on 2026-08-06 (branch
  `architecture-refactoring`, HEAD `36d8574`). Re-verify each file:line before
  changing it — the code may have moved.
- One commit per phase, independently shippable, in the order given.
- After every phase: `pnpm format:check && pnpm typecheck && pnpm lint && pnpm test
&& pnpm build` (there is no `build:ci` script until Phase 0 adds it), plus the
  phase-specific proof listed at the end of each phase.
- `.env.local` points at the LIVE Supabase DB (`aws-1-ap-northeast-1.pooler.
supabase.com`). Treat every local prisma command as a production operation.
  Mock mode (empty `DATABASE_URL`) is the safe playground — the service layer
  dual-paths on `isUsingMockData()` (`src/lib/api/listings-service.ts:40`); keep
  that fallback working in every refactor.

## Step 0 — Baseline (before changing anything)

There is no production URL yet (no linked Vercel project in the checkout), so
baselines are local:

- `pnpm dev` and time (browser devtools or curl) `/az`, `/az/listings`,
  `/az/listings/<slug>`, `/api/listings?limit=24`, `/api/regions?include=villages`.
- Turn on Prisma query logging (dev already logs queries —
  `src/lib/prisma.ts:8-10`) and count queries per request for: catalogue page load,
  detail page load, admin listing create with ~8 photos, admin listing edit.
- Record numbers in this file's appendix. Re-measure after each phase and at the end.

---

## Phase 0 — Foundations (safety rails; everything else depends on this)

### 0.1 Baseline Prisma migrations ← the #1 risk in the repo

Today: NO migration history. `prisma/migrations/` holds two loose, hand-run `.sql`
files (`20260521_listing_categories_array.sql`, `20260521_admin_logs.sql`), no
`migration_lock.toml`, no timestamped folders. The schema is applied via
`prisma db push` + psql. The datasource has **no `directUrl`**
(`prisma/schema.prisma:5-8`) — that's why `scripts/prisma-direct.sh` exists.
Until this is fixed, no schema/index work is safe.

1. Add `directUrl = env("DIRECT_URL")` to the datasource block.
2. Generate a baseline: `prisma migrate diff --from-empty --to-schema-datamodel
prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql`.
   Compare it against the live DB state (`prisma migrate diff --from-url $DIRECT_URL
--to-schema-datamodel ...` should be empty apart from the two hand-run files'
   content, which is already IN the schema — verify).
3. `prisma migrate resolve --applied 0_init` against the live DB; commit
   `migration_lock.toml`. Keep the two legacy `.sql` files as documentation or fold
   a note into the init migration.
4. Simplify `package.json` prisma scripts to plain `dotenv -e .env.local -- prisma …`
   (directUrl now handles the pooler split); retire `scripts/prisma-direct.sh`.
5. Proof: `pnpm dotenv -e .env.local -- prisma migrate status` reports schema up to
   date, zero pending, zero drift.

### 0.2 Region + connection pool

- Create `vercel.json`: `{ "$schema": "https://openapi.vercel.sh/vercel.json",
"regions": ["hnd1"] }` (decision: DB stays Tokyo, functions co-locate).
- `DATABASE_URL` gains `&connection_limit=5&pool_timeout=10` (`.env.example:12`
  already documents the shape; `.env.local` currently has only `?pgbouncer=true`).
  Same value goes into Vercel dashboard env when the project is linked.

### 0.3 CI + repo hygiene

- Add `"build:ci": "prisma generate && next build"` and
  `"packageManager": "pnpm@<version from pnpm -v>"` to package.json.
- `.github/workflows/ci.yml`: pnpm install → `format:check`, `typecheck`, `lint`,
  `test`, `build:ci` (mock mode: leave DATABASE_URL unset so the build uses the
  mock service path). `format:check` already exists (`package.json:13`) — CI is
  what's missing. (emlak-uz's workflow is the template.)
- Fix `README.md:8` — `npm install` → `pnpm install` (a committed pnpm-lock exists).

### 0.4 Rate limiting (minimum viable)

Nothing in the repo is rate limited — including `POST /api/admin/auth/login`
(`src/app/api/admin/auth/login/route.ts`), which compares plaintext env creds
(`ADMIN_LOGIN`/`ADMIN_PASSWORD`, timingSafeEqual but brute-forceable and invisible).

- Add a small fixed-window limiter (in-memory Map keyed by IP is acceptable for a
  single-region deployment; Upstash if available) applied to `/api/admin/auth/login`
  (strict: ~5/min) and `/api/calls` (loose: ~30/min).
- Keep the existing structured `admin_auth_failed` JSON log (`login/route.ts:30-43`).

### 0.5 Error tracking / logging

No Sentry, no logger module — 28 raw `console.*` calls are the logging layer.

- Minimum: `src/lib/logger.ts` (mirror emlak-uz) and migrate the route catch
  blocks; keep the 3 structured-JSON log points (`admin_auth_failed`,
  `admin_log_write_failed`, `call_click`) as-is.
- Preferred: add `@sentry/nextjs` (copy emlak-uz's config shape).

**Phase 0 proof:** CI green on the branch; migrate status clean; login endpoint
returns 429 under hammering.

---

## Phase 1 — Correctness & admin workflow

_(The product currently looks broken to its operator: nothing they change appears
on the site until a redeploy.)_

### 1.1 Revalidation — the biggest functional bug

Verified: `grep -r "revalidatePath\|revalidateTag" src/` → **zero hits**. All public
pages are fully static (`.next/prerender-manifest.json`: `/az`, `/ru`, `/en` with no
`initialRevalidateSeconds`); home reads Prisma directly at build
(`src/app/[locale]/page.tsx:75`); detail/region pages use `generateStaticParams`
with no `revalidate`. Admin create/update/delete
(`src/app/api/admin/listings/route.ts:116`, `[id]/route.ts:65,94`, region/village
routes) invalidate nothing.

1. Page-level ISR safety nets: `export const revalidate = 300` on
   `src/app/[locale]/page.tsx` and `regions/[slug]/page.tsx`; `600` on
   `listings/[slug]/page.tsx`.
2. Create `src/lib/api/revalidate-listings.ts` — port emlak-uz's
   `revalidateListingSurfaces(slug?)` pattern: bust home (all locales), region
   pages, sitemap, and — when the slug is known (every admin mutation knows it) —
   only that listing's per-locale detail paths (`/${locale}/listings/${slug}` for
   az/ru/en), falling back to the wildcard `'/[locale]/listings/[slug]', 'page'`
   only when it isn't. Call it from EVERY admin mutation: listing create/PATCH/
   DELETE, images POST/DELETE, region and village CRUD.
3. API caching: the two `export const revalidate` directives
   (`src/app/api/listings/route.ts:2` = 60, `[slug]/route.ts:2` = 300) are **inert**
   — both handlers read the request URL, which makes them dynamic. Remove the
   directives (leave a comment why) and instead set explicit headers via
   `src/lib/api/api-response.ts` (today it sets none): `Cache-Control: public,
s-maxage=60, stale-while-revalidate=300` on public GETs, `private, no-store` on
   everything under `/api/admin/*`.
4. Proof: with `pnpm build && pnpm start` locally, edit a listing through the admin
   → the public detail page and home reflect it without a rebuild.

### 1.2 `Listing.status` — draft/publish/archive workflow

There is no status field: creating a listing publishes it instantly; the only way to
unpublish is deletion. Add:

- `enum ListingStatus { DRAFT PUBLISHED ARCHIVED }` +
  `status ListingStatus @default(PUBLISHED)` (default preserves current data), via a
  real migration (possible now thanks to 0.1).
- A `publicListingWhere = { status: 'PUBLISHED' }` constant applied in EVERY public
  read: `buildWhere` (`src/lib/api/listings-service-db.ts:28`), `getListingBySlug`,
  similar listings, `src/app/sitemap.ts`, `generateStaticParams`, and the mock
  service equivalents.
- Admin: status select in the listing form, status badge + filter in the admin list,
  and status flip actions. Include `status` in `recordAdminLog` metadata.

### 1.3 Stop emitting fabricated structured data

`Listing.rating`/`reviewCount` render on cards and are emitted as `aggregateRating`
in Accommodation JSON-LD (`src/lib/json-ld.ts`) — but there is **no Review model**
and the numbers aren't even editable in the admin form. That's a Google
structured-data policy risk (fabricated reviews). Emit `aggregateRating` **only when
`reviewCount > 0`**, and since nothing can currently set it, the practical effect is
dropping it. Keep the UI stars if the operator wants them, but don't lie to Google.

### 1.4 `phone` type mismatch

`Listing.phone` is `String?` in Prisma (`schema.prisma`), but **required** in
`createListingSchema` and non-nullable in `src/types/index.ts`. A NULL-phone row
renders a broken `tel:` link (`src/components/listings/call-button.tsx`). Align: TS
type nullable, guard the CallButton (hide when absent), keep the create-form
requirement if the operator wants every listing callable.

### 1.5 react-query `initialData` key-scoping bug (correctness, not just perf)

`src/components/listings/listings-view.tsx:32-37` passes the SSR payload as
`initialData` for **whatever the current query key is**. When a filter changes, the
new key gets seeded with the old SSR data, and with `staleTime: 60_000`
(`src/components/providers/query-provider.tsx:12`) and nuqs `shallow: true`, react-
query considers it fresh and **doesn't fetch** — the user sees wrong results for up
to a minute. Fix: seed only the SSR key (capture the initial key in a ref, emlak-uz
`use-listings-infinite.ts` shows the shape, including dating the seed with a server
`initialFetchedAt` clamped to the client clock).

**Phase 1 proof:** admin edit visible without redeploy; draft listing invisible on
all public surfaces incl. sitemap; toggling a filter always refetches; Rich Results
test shows no aggregateRating without reviews.

---

## Phase 2 — Server/DB round-trips & payloads

1. **Split the fat include.** `LISTING_INCLUDE`
   (`src/lib/api/listing-dto.ts:9-14`) fetches full region/village/amenity/image
   rows for every read; `rowToDto` uses ~20% of it, and the DTO ships 3-locale
   `description` to card UIs that never render it. Create `LISTING_CARD_SELECT`
   (no description; `amenity: { select: { slug } }`; `images: { select: { url },
orderBy: { order: 'asc' }, take: 1 }`; region/village slug+name only) and
   `LISTING_DETAIL_SELECT` (full). Type the DTO mappers off the selects
   (emlak-uz `listing-mapper.ts` shows the `satisfies Prisma.ListingSelect` +
   `Prisma.ListingGetPayload` pattern) so a dropped field fails typecheck.
2. **Slug-only feeds.** `generateStaticParams`
   (`src/app/[locale]/listings/[slug]/page.tsx:22-27`) and `src/app/sitemap.ts:48`
   each pull **1000 fully-hydrated listings** to read slugs. Add
   `listListingSlugs()` → `findMany({ where: publicListingWhere, select: { slug,
createdAt }, orderBy: { createdAt: 'desc' } })`; cap static params at the newest
   ~100 slugs × 3 locales (dynamicParams renders the long tail on demand).
3. **`react.cache(getListingBySlug)`** — the detail request fetches the same listing
   2-3× (generateMetadata `:41`, page body `:67`, OG image `opengraph-image.tsx:28`).
   `regions/[slug]/page.tsx:26` already does `cache(listRegions)` — same pattern.
4. **Parallelize:**
   - `$transaction([findMany, count])` (`listings-service-db.ts:141-144`) runs the
     two scans **sequentially on one connection** → `Promise.all` (snapshot
     consistency isn't needed for a catalogue count).
   - 4 serial pre-insert lookups in `admin/listings/route.ts:39-75`
     (region, village, slug prefix scan, amenities) → `Promise.all` the independent
     ones; same on the update path (`listings-service-db.ts:203-225`).
5. **Return the row from the write.** Mutation-then-refetch with the fat include:
   `listings-service-db.ts:266`, `admin/regions/[id]/route.ts:105-109`,
   `admin/villages/[id]/route.ts:93-97` → `update({ ..., select })`, drop the
   follow-up read.
6. **Kill redundant reads:** duplicate region-by-slug lookup in
   `api/regions/[slug]/villages/route.ts:17-23` (the service does the same lookup
   again); listing existence pre-check before image upload (`images/route.ts:39` —
   the FK enforces it); port emlak-uz `src/lib/prisma-errors.ts`
   (`isUniqueConstraintError` with composite-target support) and use P2002 handling
   instead of slug pre-scans where applicable. Note the
   `slug: { startsWith }` scans (`admin/listings/route.ts:63` etc.) can't use the
   unique btree under default collation — either add a `text_pattern_ops` index in
   Phase 4 or generate the suffix without scanning.
7. **Unblock response paths:** `recordAdminLog` is awaited after every mutation
   (9 call sites) and the storage delete blocks the DB delete in
   `images/[imageId]/route.ts:29-30` — wrap in `after()` from `next/server`
   (NOT a bare floating promise: Vercel freezes the invocation when the response
   flushes) with error logging.
8. **Image upload:** `admin/listings/[id]/images/route.ts:90-106` uploads and
   inserts **serially in a for-loop** (12 files = 24 sequential round-trips), and
   the client sends all files in one multipart request so partial failure loses
   everything and progress jumps 0→total (`use-listing-submit.ts:75-120`).
   → `Promise.all` the storage uploads + one `prisma.image.createMany`; make the
   client upload per-file (or small batches) so progress is real and failures are
   partial. (Presigned direct-to-storage uploads: optional stretch, deferred.)

**Phase 2 proof:** query-count re-measure — catalogue page ≤3 queries, detail ≤2
(cached), admin create with 8 photos ≥5× faster than baseline; payload of
`/api/listings?limit=24` visibly smaller (record before/after content-length).

---

## Phase 3 — Client feel

1. **Pagination** (nothing has it; public + admin hard-capped at `limit: 100` —
   `[locale]/listings/page.tsx:97`, `admin-listings-list.tsx:34`; the API already
   returns `meta.total/page/hasMore`): infinite query on `/listings` (port emlak-uz
   `use-listings-infinite.ts` — keyed on the filter state, SSR-seeded per 1.5,
   `keepPreviousData`), simple pager on the admin list.
2. **Stop duplicate fetches:** pass the already-loaded `listings` into
   `FilterModal` (`listings-top-bar.tsx:69` omits the prop → the modal's lazy path
   `filter-modal.tsx:57-60` refetches 100 rows); gate `ActiveFiltersBar`'s
   region+village catalogue fetch (`active-filters-bar.tsx:28`) on there being
   active location chips.
3. **Filter-compat counts:** `src/lib/listings-filter.ts:126-139` runs a full
   predicate pass per option (~2600 evals/keystroke, and over a truncated 100-row
   sample). Rewrite as a single pass building per-option counters; long-term the
   counts belong server-side, but the single-pass version is the Phase-3 fix.
4. **Bundle:** `next/dynamic` the Calendar (`booking-card.tsx:5,11` pulls
   react-day-picker + its CSS + date-fns eagerly on every detail page for a widget
   behind a Popover). Leaflet is already done right
   (`listings-map-loader.tsx` + `LazyMount`) — don't touch it. Note-only: two icon
   libraries ship (tabler in 42 files + lucide in calendar.tsx) and the full
   18-25KB message bundle rides in every RSC payload
   (`[locale]/layout.tsx:54-59`) — record as deferred unless time allows.
5. **Admin UX:** `loading.tsx` skeletons for `/admin/listings` and `/admin/regions`
   (currently blank while the client fetch waterfall runs); a slim admin list
   endpoint (admin list consumes the public fat DTO today); `setQueryData` patching
   from mutation responses instead of the blanket
   `invalidateQueries(['regions'])`-style invalidations in `use-admin-regions.ts` /
   `use-admin-villages.ts` (responses already return the updated DTO).

**Phase 3 proof:** catalogue scrolls past 100 listings; opening the filter modal
issues zero extra listing requests; detail-page JS shrinks (compare `pnpm build`
route table before/after); admin lists paint skeletons instantly.

---

## Phase 4 — Indexes (requires Phase 0.1 baseline + Phase 1.2 status column)

Current `Listing` indexes are all single-column (`prisma/schema.prisma:145-151`):
GIN on `categories`, btrees on regionId/villageId/placeType/price/rating/createdAt.
From the actual `buildWhere`/`buildOrderBy` (`listings-service-db.ts:28-131`), add
via a normal migration:

- `@@index([status, createdAt(sort: Desc)])` — the new default catalogue scan.
- `@@index([regionId, createdAt(sort: Desc)])`, `@@index([placeType, createdAt(sort: Desc)])`
  — hot filter+sort combos (today PG filters then sorts).
- `@@index([capacity])` — hero search filters on it (`:100-107`), unindexed.
- `@@index([meals], type: Gin)`, `@@index([activities], type: Gin)` — `hasEvery`
  array queries (`:76,:82`) currently seq-scan.
- pg_trgm: `CREATE EXTENSION IF NOT EXISTS pg_trgm` + GIN `gin_trgm_ops` on
  `address` (the `q` search does `ILIKE '%q%'` — `:110`). For the 3-locale JSONB
  `title` search (`:111-114`, a full JSONB scan ×3), add a denormalized
  `search_text` column maintained on write + trigram GIN over it (raw SQL in the
  migration; document the drift as emlak-uz did).
- `@@index([slug])` on `Village` (only `[regionId, slug]` exists; slug-only lookups
  at `:46` can't use it).
- `text_pattern_ops` index on `listings.slug` IF the startsWith scans survived
  Phase 2.6; otherwise skip.

Apply with `prisma migrate deploy` via DIRECT_URL. Plain CREATE INDEX is fine at
current table sizes; revisit CONCURRENTLY past ~10⁵ rows.

**Phase 4 proof:** `prisma migrate status` clean; EXPLAIN on the catalogue query
with a region filter + newest sort shows index-ordered scan, not Sort node.

---

## Phase 5 — Feature completion (curated-catalogue scope)

1. **Wire the dead filters** — the highest-value/lowest-cost feature work in the
   repo. `price_min`/`price_max`/`capacity`/`category` are fully implemented
   server-side (`src/lib/api/listings-validator.ts:52-54`,
   `listings-service-db.ts:94-107`, `PRICE_BOUNDS` in `src/lib/constants.ts:72`)
   but absent from `ListingsFilterState` (`src/types/index.ts`),
   `listings-filter-parsers.ts`, and `queryFromFilterState` — so they have no UI,
   and worse, the homepage hero's `?capacity=` + landing `?category=` are silently
   DROPPED the moment the user touches any other filter. Add them to the state
   type + nuqs parsers + `queryFromFilterState` + FilterModal controls (price
   range slider off PRICE_BOUNDS, capacity stepper, category chips) +
   ActiveFiltersBar chips + the mock-side `applyListingsFilter`.
2. **CallEvent** — the phone tap is this business's ONLY conversion, and
   `/api/calls` throws it away (`route.ts:22` — "MVP: log to stderr"). Add a
   `CallEvent` model (listingId FK SetNull, locale, source, createdAt, `@@index
([listingId, createdAt])`), persist in the route (keep the rate limit from 0.4),
   and show a per-listing count + 30-day total in the admin list/detail.
3. **Admin tools:**
   - Image cover-select + reorder: `Image.order` exists but is append-only; cover
     is silently `order[0]` forever. Add reorder (PATCH accepting ordered ids →
     one `$transaction` of updates — emlak-uz's images route shows the array-tx
     batch) and "make cover" (move to order 0).
   - `Region.coverImage` upload (today a bare URL text field) reusing the existing
     storage pipeline + magic-byte sniffing; then delete the hardcoded Unsplash
     slug→URL fallback map (`src/components/home/regions-grid.tsx:10-36`).
   - `/admin/logs` — AdminLog is written on every mutation and never read
     (schema comment admits the UI is "forthcoming"). Simple filterable table.
   - `/admin/amenities` CRUD — Amenity is seed-only AND duplicated as a TS union
     (`src/types/index.ts`) + `AMENITIES` constant; drift silently breaks
     filtering. Make the DB the source of truth, serve options from
     `/api/regions`-style endpoint, keep slugs stable.
4. **i18n + dead-code cleanup:** translate the hardcoded English footer links
   (`site-footer.tsx:20-22`), `[locale]/not-found.tsx`, `[locale]/error.tsx`,
   and the two `Loading…` fallbacks; remove the 13 orphaned message keys
   (favorites/host-profile/check-in remnants); delete dead `src/lib/validations.ts`
   (zero importers).
5. **Explicitly deferred** (do not build without a new decision): Booking/
   reservation model (the calculator stays a calculator), reviews system, public
   accounts/favorites/saved-searches/notifications/email, Frankfurt DB migration,
   presigned direct uploads, marketplace anything.

**Phase 5 proof:** hero search with guests=6 survives filter changes; a call tap
appears in admin stats; cover photo changeable without re-uploading; new amenity
added in admin appears in the filter modal without a code change.

---

## What is already good — do not regress

Leaflet lazy-loaded + IntersectionObserver-gated; image compression in a web worker;
`react.cache` on the regions page; `Promise.all` fan-outs on detail/edit pages;
skeleton (not spinner) loading.tsx on public routes; `Promise.allSettled` storage
cleanup on delete; magic-byte upload sniffing; admin defense-in-depth (middleware +
`requireAdmin()` in all 24 handler sites, fail-closed on missing config); the
3-layer production-domain SEO hibernation gate; sanitized JSON-LD; the mock-data
mode; the airbnb-style gallery; live filter-compatibility counts (keep the UX,
fix the algorithm).

## Order of work

0 → 1 → 2 → 3 → 4 → 5. Phase 0 unblocks schema work and makes everything
verifiable; Phase 1 fixes what the operator experiences as "the site is broken";
2–3 are the speed playbook; 4 needs 0's migration baseline and 1's status column;
5 is product polish on a solid base. Each phase lands as its own commit and is
shippable alone.

## Appendix — baseline measurements

**Measured 2026-08-06 in MOCK MODE** (`pnpm dev`, warm second pass, curl TTFB).
The live Supabase project `hephcgowtartwbsnidbx` was unreachable at baseline
time — pooler answers `tenant/user not found` and the REST endpoint doesn't
respond, i.e. the project is **paused or deleted**. All DB-dependent metrics
(query counts, live TTFB, admin create timing) are N/A until it is restored.
Live-DB apply steps pending restore: `prisma migrate resolve --applied 0_init`,
then `prisma migrate deploy` for the status + index migrations.

| Metric                                | Baseline (mock) | After P2 | After P3 | Final |
| ------------------------------------- | --------------- | -------- | -------- | ----- |
| /az/listings local TTFB               | 0.073s          |          |          |       |
| /az/listings/<slug> local TTFB        | 0.114s          |          |          |       |
| Queries per catalogue request         | N/A (DB down)   |          |          |       |
| Queries per detail request            | N/A (DB down)   |          |          |       |
| /api/listings?limit=24 content-length | 16,859 B        | 10,675 B (−37%) |          |       |
| Admin create w/ 8 photos (wall time)  | N/A (DB down)   |          |          |       |
