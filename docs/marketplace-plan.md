# irayon → Airbnb-style Marketplace Transformation

## Context

irayon is today a single-admin curated rental catalogue: one operator creates all listings via `/admin`, and the entire conversion funnel is a `tel:` phone link (the booking card is a display-only price calculator). The goal is to turn it into a marketplace where any user can register, become a host with their own cabinet, create listings (admin-moderated), receive and accept booking requests, and message guests — production-grade: secure, reliable, fast, scalable.

**User-confirmed product decisions (final):**

- No online payments — booking coordination only; money settles offline. Schema stays payment-ready.
- Request-to-book only (guest requests dates → host accepts/declines within an expiry window).
- Open host signup, but new listings + significant edits require admin approval before going public.
- Guests must register to book. Single `User` model; host is a capability, not an account type.
- Messaging = thread per booking (polling), email notification on new message. No standalone chat.
- Reviews: schema-ready design only, do NOT build.
- Auth: **Auth.js (NextAuth v5), Google provider ONLY** — no passwords at all. (Fulfills the existing memory note: migrate off custom HMAC admin auth when multi-user lands.)
- Email via **Resend**; durable rate limiting via **Upstash Redis**.
- Existing admin listings → backfilled to an admin host account (admin uses the same host cabinet + keeps admin panel).
- **Staged production releases**: Stage 1 auth+cabinet+moderation → Stage 2 bookings+availability → Stage 3 messaging+polish.

**Codebase conventions to follow** (verified): Zod validators in `src/lib/api/*-validator.ts`; service facades dual-pathed on `isUsingMockData()` (mock path keeps CI building with no DB); route handlers only — zero server actions; `after()` for AdminLog + emails; `revalidateListingSurfaces()` for ISR busting; `apiOk/apiBadRequest` helpers with CDN cache headers; hooks in `src/hooks`; DTO selects `satisfies Prisma.ListingSelect` in `listing-dto.ts`; enums `@map`'ed lowercase so DB value == wire value.

## Key architecture decisions

| Decision                  | Choice                                                                                                                                                                      | Reason                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role model                | `role: user\|admin` enum; host = capability (`becameHostAt` timestamp, set on first listing)                                                                                | Any guest becomes a host without role migration; Airbnb model                                                                                       |
| Session strategy          | JWT (`strategy: 'jwt'`) + Prisma adapter for user/account rows                                                                                                              | Edge middleware can't run Prisma through pgbouncer; JWT verify is Web-Crypto-only, keeps middleware fail-closed and DB-free                         |
| Revocation                | `User.sessionVersion` int in JWT as `sv`; Node-side `requireUser()` re-checks DB, cached (see below); a failed check **terminates the session**, not just the request       | Middleware optimistic, server strict. A 401 that leaves the cookie in place is a permanently broken page, not a sign-out                            |
| Moderation                | Separate `moderationStatus` column (pending/approved/rejected), orthogonal to `status` (draft/published/archived)                                                           | Host lifecycle intent vs platform gate; public = `PUBLISHED AND APPROVED`. Two small state machines beat one 9-state machine                        |
| Moderation actor          | Moderation gates **untrusted input only** — anything reached through `requireAdmin()` applies live                                                                          | An admin is not untrusted input; after B1 the admin is the principal host of every legacy listing and would otherwise queue edits for self-approval |
| Significant edits         | `Listing.pendingChanges Json?` for scalar fields + `Image.moderationState` for photos — approved content stays live while edits await review                                | No versioning table; listing never goes offline during re-moderation                                                                                |
| Booking overlap           | Postgres exclusion constraint (`btree_gist`, accepted-only) as invariant + `SELECT … FOR UPDATE` on listing row in accept transaction; blocks checked in the same locked tx | Constraint can't race; row lock works through pgbouncer transaction pooling (session advisory locks don't)                                          |
| Booking dates             | Date-only (`@db.Date`), half-open `[checkIn, checkOut)`                                                                                                                     | Azerbaijan single-TZ; kills DST/TZ edges; matches check-in/out semantics                                                                            |
| Cleaning fee              | New `Listing.cleaningFee Int @default(0)`, host-editable; delete hardcoded `CLEANING_FEE=20` in `use-booking-calculator.ts`; snapshot onto Booking                          | Platform-wide hardcoded fee is wrong once hosts exist                                                                                               |
| Booking notifications     | `Notification` row written **inside** the same transaction as the status change; email is best-effort on top                                                                | `after()` has no retry or outbox; email must not be the system of record for "your booking was accepted"                                            |
| Booking expiry/completion | Vercel cron hourly (`/api/cron/bookings`, `CRON_SECRET` bearer, fail-closed, bounded to 100/run)                                                                            | Expiry must send emails/notifications — app-layer logic                                                                                             |
| Messaging transport       | TanStack Query polling (5s open thread, 60s badge, no background refetch, idle backoff)                                                                                     | Supabase Realtime would need anon key + RLS keyed to Supabase Auth — a parallel authz system; polling is one indexed query and fits existing hooks  |
| Account linking           | **No** `allowDangerousEmailAccountLinking`; admin signs in first, backfill then promotes that row                                                                           | Flag is safe only while Google is the sole provider; it becomes an account-takeover vector the day a second provider lands                          |
| Break-glass admin         | KEEP env-cred HMAC login, gated behind `ADMIN_BREAK_GLASS=true` env (default off in prod)                                                                                   | Google-only auth means OAuth misconfig/outage locks out the operator; mechanism already exists, stores no passwords                                 |
| Fake ratings              | Keep columns; UI hides stars when `reviewCount === 0`                                                                                                                       | New host listings never show fake stars; legacy listings unchanged; zero migration risk                                                             |
| Listing deletion          | `Booking→Listing onDelete: Restrict`; hosts archive, never hard-delete once bookings exist                                                                                  | Booking history is a support/legal record                                                                                                           |
| User deletion             | Anonymise, never delete (see §Abuse & lifecycle)                                                                                                                            | `Booking→User Restrict` makes deletion physically impossible once anyone has booked                                                                 |

## Schema (new models, Prisma)

New enums (all `@map`'ed lowercase): `UserRole { USER, ADMIN }`, `ModerationStatus { PENDING, APPROVED, REJECTED }`, `BookingStatus { PENDING, ACCEPTED, DECLINED, EXPIRED, CANCELLED, COMPLETED }`, `ImageModerationState { LIVE, PENDING_ADD, PENDING_REMOVE }`.

**User**: id cuid, name?, email @unique, emailVerified?, image?, role (default USER), preferredLocale (default "az", drives email locale), phone?, becameHostAt?, suspendedAt?, sessionVersion Int @default(0), relations (accounts, sessions, listings "HostListings", bookings "GuestBookings", messages, notifications, adminLogs, moderatedListings, reports). **Account/Session** per Auth.js Prisma adapter (Session unused under JWT but created now so switching strategies later is config-only; no VerificationToken until a non-OAuth provider lands).

**Listing additions**: `hostId String?` → `User` (Restrict; nullable through rollout, then contracted to required), `moderationStatus`, `moderationNote?`, `moderatedAt?`, `moderatedById?` (SetNull), `pendingChanges Json?`, `cleaningFee Int @default(0)` (Stage 2). New indexes: `[hostId, createdAt desc]`, `[moderationStatus, createdAt desc]`, `[status, moderationStatus, createdAt desc]`.

**Moderation default is fail-closed.** Within M1: add the column with `DEFAULT 'approved'` so existing rows keep visibility, and as the _last statement of the same migration_ flip it — `ALTER TABLE listings ALTER COLUMN moderation_status SET DEFAULT 'pending'`. Prisma declares `@default(PENDING)` so schema and DB agree from M1 onward. An omission in any future create path then yields an invisible listing, not an unmoderated public one. **Consequence to handle in the same PR**: `POST /api/admin/listings` and `prisma/seed.ts` both rely on column defaults today and must now set `moderationStatus: APPROVED` explicitly.

**Image addition**: `moderationState ImageModerationState @default(LIVE)`. The default is _not_ the gate — `LIVE` is correct for images on a PENDING listing and wrong for a live one, so neither default is right in both contexts. State is always **derived**, never written literally (see §Moderation, `nextImageState()`). This reuses the existing `Image` rows, reorder endpoint, per-image delete, and storage-cleanup path rather than forking into a parallel JSON representation, and needs no orphan-blob GC job.

**Booking** (Stage 2): listingId (Restrict), guestId (Restrict), status, checkIn/checkOut `@db.Date` (half-open), guestCount, guestNote?, priced snapshot (pricePerNight, cleaningFee, nights, total, currency default "AZN"), expiresAt, acceptedAt?/declinedAt?/declineReason?/cancelledAt?/cancelledBy? ('guest'|'host'). Indexes: `[listingId, status, checkIn]`, `[guestId, createdAt desc]`, `[status, expiresAt]`, `[status, checkOut]`.

**AvailabilityBlock** (Stage 2): listingId (Cascade), startDate/endDate `@db.Date` half-open, note?. Index `[listingId, startDate]`.

Raw SQL in Stage 2 migration (pending requests MAY overlap; only `accepted` participates):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_accepted_overlap
  EXCLUDE USING gist (listing_id WITH =, daterange(check_in::date, check_out::date, '[)') WITH &&)
  WHERE (status = 'accepted');
ALTER TABLE bookings ADD CONSTRAINT bookings_valid_range CHECK (check_out > check_in);
ALTER TABLE availability_blocks ADD CONSTRAINT blocks_valid_range CHECK (end_date > start_date);
```

**Notification** (moved forward to **M3/Stage 2**, no dependency on Conversation): userId, type string, data Json?, readAt?, index `[userId, readAt, createdAt desc]`. Written transactionally with booking status changes; delivers the header unread badge in Stage 2, and `GET /api/account/unread` gains a second counter in Stage 3 rather than being introduced late.

**Conversation** (Stage 3): bookingId @unique (Cascade; participants derive from booking→guest + listing→host), guestLastReadAt?/hostLastReadAt?, lastMessageAt?, lastEmailedAt? (debounce: at most one email per unread stretch). **Message**: conversationId (Cascade), senderId (Restrict), body (zod max 2000), index `[conversationId, createdAt]`.

**Report** (Stage 3, schema lands with M4): reporterId, targetType `'listing'|'user'|'message'`, targetId, reason, note?, resolvedAt?, resolvedById?. Index `[resolvedAt, createdAt]`.

**Review** — commented sketch only (bookingId @unique, listingId denorm, rating 1..5, hostReply?, publishedAt?). Prereqs (COMPLETED status, unique booking) already designed in.

**AdminLog**: wire real FK `adminId → User` (SetNull); handlers pass `session.user.id`; break-glass logs `adminId: null` + `metadata.breakGlass: true`.

### Migration ordering (expand → backfill → contract, live-DB safe)

1. **M1** (Stage 1, additive): enums, users/accounts/sessions, listings.host_id nullable + moderation columns, `images.moderation_state`, indexes, admin_logs.admin_id FK, moderation default flip (last statement).
2. **Manual gate**: admin signs in with Google once → Prisma adapter creates their `User` row naturally. No account-linking flag needed.
3. **B1**: `scripts/backfill-admin-host.ts` (tsx, DIRECT_URL): look up user **by** `ADMIN_EMAIL` (fail loudly if absent — means step 2 was skipped), promote `role: ADMIN`, set `becameHostAt`, bump `sessionVersion`, then `UPDATE listings SET host_id = <id> WHERE host_id IS NULL`. Idempotent.
   **Runbook trap**: edge middleware reads `role` from the JWT, which still says `USER` after promotion. The `sessionVersion` bump makes the next server-side strict check fail, which now actively expires the cookie (see §Auth) and redirects to sign-in — so the admin signs in again and receives a JWT with `role: ADMIN`. Without the cookie-clearing behaviour this step would strand the admin holding a stale token.
4. **M2** (≥1 release later): `host_id SET NOT NULL`.
5. **M3** (Stage 2): bookings, availability_blocks, notifications, cleaning_fee, btree_gist + constraints (`NOT VALID` + `VALIDATE` on populated tables).
6. **M4** (Stage 3): conversations, messages, reports.

## Auth.js integration

- `src/auth.config.ts` — edge-safe (no Prisma import): Google provider, JWT strategy (30d maxAge, 24h updateAge), prod cookie `__Host-irayon_session`, callbacks embedding `{ sub, role, sv }`. `src/auth.ts` — full config + `PrismaAdapter(prisma)` + `events.createUser` (set preferredLocale from `NEXT_LOCALE` cookie). `src/app/api/auth/[...nextauth]/route.ts` exports handlers.
- **`src/lib/auth-helpers.ts`** (successor to `admin-auth.ts`; keep `admin-session.ts` for break-glass): `requireUser({ force? })`, `requireAdmin()` (403; also accepts valid break-glass HMAC cookie), `requireHost()`, `requireListingOwner(listingId)` (404 not 403 — no enumeration; admin bypass), `requireSameOrigin(request)`. Result shape mirrors existing `AdminAuthResult` (`{ok:true,user}|{ok:false,response}`) so migrating the 24 admin handler call sites is mechanical.
- **Failed strict check terminates the session.** `invalidSession()` returns the 401/redirect _and_ appends a `Set-Cookie` expiring the session cookie (`Max-Age=0`, same name/attrs, `__Host-` rules respected). Applies to three cases: `sv` mismatch (revoked), `suspendedAt != null` (suspended), and a user row that no longer exists. Page routes redirect to `/{locale}/signin?reason=session_expired|suspended` with a distinct message for suspension rather than looping the user through Google. Without this a revoked or suspended user keeps a cookie that yields a broken page on every request, forever.
- **Suspension must also block sign-in**, or Google issues a fresh valid JWT and the suspension is bypassed for the cache window. In the Auth.js `signIn` callback, look up **by email** (a first-time signup has no row yet, so an id lookup would reject every new user) and reject when `suspendedAt` is set:
  ```ts
  async signIn({ user }) {
    if (!user.email) return false;
    const row = await prisma.user.findUnique({
      where: { email: user.email }, select: { suspendedAt: true },
    });
    return row == null || row.suspendedAt == null; // no row = new user, allow
  }
  ```
- **Strict-check caching.** `requireUser()` re-reads `{role, sv, suspendedAt}` from the DB, which on a 5s polling loop against `connection_limit=5` compounds fast. Two layers: `React.cache()` for request-scoped dedupe (the codebase already uses this for `getListingBySlug`), plus a 60s Upstash TTL cache keyed by userId, invalidated on revoke/suspend. Mutations pass `force: true` and skip both caches. **Documented bound**: if the invalidating `DEL` fails, enforcement is delayed up to 60s — acceptable, but a known property rather than a discovered one. _(Not viable: a `svCheckedAt` TTL in the JWT — Next can't set cookies during an RSC render, so the token would never be rewritten and the TTL would never advance.)_
- **Middleware rewrite** ([src/middleware.ts](src/middleware.ts)): keep structure; admin gate accepts JWT `role==='admin'` (via `getToken`) OR break-glass HMAC; new gates for `/:locale/host/*`, `/:locale/account/*` (redirect to `/{locale}/signin?next=…`) and `/api/host|account|bookings|conversations` (401 JSON); fail-closed 503 on missing `AUTH_SECRET` (≥32 chars); extend `withNoIndex` private/no-store stamping to the new private API prefixes. **Fix the dot-path matcher hole**: replace the `.*\\..*` exclusion with an explicit static-asset extension allowlist so `/admin/x.y` can't bypass the gate.
- **Per-page defense in depth**: `requireAdmin()` in `src/app/admin/(authed)/layout.tsx`; `requireUser()/requireHost()` in new host/account layouts (admin server components currently rely 100% on middleware).
- **CSRF**: Auth.js protects its own endpoints; all user-initiated POST/PATCH/DELETE handlers add `requireSameOrigin`. **`/api/cron/*` is explicitly exempt** — Vercel Cron issues a server-side request with no `Origin` and no `Sec-Fetch-Site`, so an origin check would 403 every invocation, invisibly, inside a job nobody watches. Cron authenticates by bearer token only, fail-closed on a missing/mismatched `CRON_SECRET`, compared as **SHA-256 digests** via `timingSafeEqual` (raw `timingSafeEqual` throws on unequal lengths, and the early-return workaround used by the existing login route leaks length).

## Routes & UX

**Host cabinet** (localized, `requireHost`): `/[locale]/host` (dashboard), `/host/listings` (+`/new`, `/[id]/edit` — moderation badges, pending-changes banner), `/host/bookings` (inbox: pending/upcoming/past, accept/decline), `/host/calendar`, `/host/messages(/[id])`, `/host/settings`. "Become a host" → `/host/listings/new`; `becameHostAt` set server-side on first create.

**Host signup gate** — account-scoped, not boolean: allowed when `HOST_SIGNUP_ENABLED === 'true'` **or** the user's email is in `HOST_SIGNUP_ALLOWLIST` (comma-separated; contains `ADMIN_EMAIL` plus one test account). A plain boolean defaulting to off is circular — the Stage 1 production E2E begins with "become a host" and could never run. The allowlist lets the full flow be verified against real infrastructure while public signup stays closed; opening it later is one env change on an already-exercised path. When denied: CTA hidden and `POST /api/host/listings` returns 403.

**Guest**: `/[locale]/account/bookings` (cancel), `/account/messages`, `/account/settings`; `/[locale]/signin`; header `user-menu.tsx`. **Public host profile** `/[locale]/hosts/[id]` (Stage 2 — builds trust for offline settlement).

**Form reuse** (Stage 1 refactor, do first): move `src/components/admin/listing-form-*` + `image-uploader.tsx` + `existing-images-grid.tsx` → `src/components/listing-form/`, parameterized `mode: 'admin'|'host'` + `endpoints` prop threaded through `use-listing-submit.ts`/`use-image-uploader.ts`.

## Moderation

**Gate choke point**: `publicListingWhere` in [src/lib/api/listings-service-db.ts](src/lib/api/listings-service-db.ts) becomes `{ status: PUBLISHED, moderationStatus: APPROVED }` — already gates catalogue, detail, sitemap, generateStaticParams. Public image selects filter `moderationState: { in: [LIVE, PENDING_REMOVE] }`. Host update payloads are zod `.strict()` so moderationStatus/hostId/rating are unassignable.

**Actor decides everything.** One shared update service takes `actor: 'host' | 'admin'` so the two paths cannot drift. On the admin path (`requireAdmin()`): `isSignificantEdit` is not consulted, `pendingChanges` is never populated, `nextImageState()` returns `LIVE` unconditionally, the row is stamped `moderatedById = session.user.id` / `moderatedAt = now()` and left `APPROVED` (a queued `PENDING` listing edited directly by an admin is promoted to `APPROVED`), plus AdminLog + `revalidateListingSurfaces()` in `after()` exactly like the approve route.

**`isSignificantEdit(current, input)`** — pure fn in `src/lib/api/listing-moderation.ts`, host path only:

- **Significant** (→ `pendingChanges`, live content unchanged): `title`, `description`, `address`, `lat`/`lng`, `placeType`, `region`/`village`, **`phone`**, **images** (when APPROVED).
- **Not significant** (apply live + revalidate): `price`, `cleaningFee`, `capacity`, `bedrooms`, `amenities`, `meals`, `activities`, `status`.

`phone` is significant because with offline settlement the phone number _is_ the conversion funnel and the payment channel — pass moderation clean, then swap the number is the highest-value abuse path in the system. `status` stays live-apply deliberately — a host must always be able to unpublish instantly.

**Coordinates: compare at fixed precision, never with raw `!==`.** The columns are `Float`; a value round-tripped through JSON, the map widget, or Prisma comes back as `41.12345670000001`, so raw inequality returns `true` on every edit and the entire live-apply path silently stops working — a host changing only the price finds it queued for review, and the failure reads as intended behaviour. Compare `Number(n.toFixed(6))` (≈11 cm, far below any meaningful relocation) and apply the same normalisation **on write** so stored and compared values can't diverge. No distance threshold: a threshold measured against the current live value is an accumulator (ten sub-threshold edits walk the pin a kilometre away, never tripping review).

**Photo state is derived, never written literally** — one choke point in the spirit of `publicListingWhere`:

```ts
// src/lib/api/listing-moderation.ts
export function nextImageState(listing, actor): ImageModerationState {
  if (actor === 'admin') return 'LIVE';
  return listing.moderationStatus === 'APPROVED' ? 'PENDING_ADD' : 'LIVE';
}
```

Both upload routes call it; neither writes `moderationState` directly. Deletion goes through a matching `markImageForRemoval(listing, actor)` that either removes the row outright (listing not public, or admin) or flips it to `PENDING_REMOVE`. Transitions — approve: `PENDING_ADD→LIVE`, `PENDING_REMOVE→` row delete + existing storage cleanup, then recompute `order`. Reject: `PENDING_ADD→` delete + storage cleanup, `PENDING_REMOVE→LIVE`.

**Approve must never empty the photo set.** A host can mark every image `PENDING_REMOVE` and add nothing; approving would leave a live listing with zero photos, and the create form's minimum-image validation never runs on this path. Two guards: the per-image delete endpoint rejects a request taking the non-`PENDING_ADD` count below the platform minimum (400 `min_images`), and — authoritatively — the approve handler computes the resulting `LIVE` set before committing and refuses with 409 `approval_would_empty_images`, surfaced in the queue UI as a reason to reject rather than approve.

**Reorder semantics** (stated so it isn't re-litigated in review): one shared `order` across all images regardless of state. The public select filters first and sorts second, so a hidden `PENDING_ADD` at position 0 simply doesn't appear and the remaining `LIVE` images keep their relative order. Reordering among approved images applies live — it's all approved content, only the permutation changes. The existing stale-set guard operates over the host-visible set (all states).

**Admin UX**: `/admin/moderation` queue (PENDING new + APPROVED with pendingChanges or non-LIVE images, oldest first); field-level diff and live-vs-pending image strip side by side. `POST /api/admin/moderation/[id]/approve` (merge via `updateListingFromDb` shape incl. searchText rebuild; `after()`: AdminLog + `revalidateListingSurfaces` + email/notification) / `reject` (reason required, min 10 chars). REJECTED flips back to PENDING on resubmit.

**Queue flood protection**: a host with **zero approved listings** may have at most one listing in PENDING at a time (one `count` in the create handler). Free Google accounts make `listingCreate 5/day/user` weak on its own; this caps what a throwaway account can do to admin attention.

**ISR invariant**: any host update handler that applies fields live calls `revalidateListingSurfaces()` in `after()`, unconditionally — not per-field. A host unpublishing must not keep serving from cache; an unnecessary revalidation costs nothing next to a missed one.

## Booking flow (Stage 2)

- `GET /api/listings/[slug]/availability?from&to` (≤12mo): merged unavailable ranges = accepted bookings ∪ blocks; CDN `s-maxage=60 swr=120`; fetched client-side when the calendar opens (`use-availability.ts`). Detail-page ISR untouched.
- [booking-card.tsx](src/components/listings/booking-card.tsx): calculator → request form. Disabled dates from availability, guest count (≤ capacity), note; unauthenticated CTA → signin with `next`. `useBookingCalculator` takes a `cleaningFee` param. CallButton stays alongside.
- `POST /api/bookings`: requireUser + requireSameOrigin + rate limit. Zod: checkIn ≥ today (Asia/Baku), checkOut > checkIn, nights ≤ 30, guestCount 1..capacity. Server re-derives the priced snapshot from the DB. Rejects: listing not publicly visible, guest==host, overlap pre-check (non-authoritative), duplicate overlapping pending request by the same guest.
- **Timezone**: `startOfDayBaku()` and the "today in Baku" validator boundary use a real IANA zone (`Asia/Baku`) via `@date-fns/tz`'s `TZDate` — date-fns 4 is already a dependency, so no `date-fns-tz` addition (whose `zonedTimeToUtc` is a v2 name anyway; v3 calls it `fromZonedTime`). A hardcoded `+4` is a latent bug: Azerbaijan abolished DST in 2016 by policy, and policies reverse. Unit-test both against a fixed clock so behaviour is pinned regardless of the CI machine's TZ.
- **Expiry floor** — `expiresAt = max(now + 2h, min(now + 24h, startOfDayBaku(checkIn)))`. Without the 2h floor a same-day request is born already expired and the next cron sweep kills it; the host always gets a minimum response window.
- `POST /api/host/bookings/[id]/accept`: interactive transaction — `SELECT id FROM listings WHERE id=$1 FOR UPDATE` → verify still PENDING+unexpired → overlap check against accepted bookings **and** availability blocks → UPDATE accepted → `notification.create` **in the same tx**. Exclusion constraint backstops (catch `23P01` → 409 `dates_unavailable`). Email in `after()`, best-effort.
- `POST /api/host/listings/[id]/blocks`: same listing row lock; reject if the range overlaps any ACCEPTED booking → 409 `dates_booked`. (Overlapping a PENDING request is fine — the host will decline it.) Both directions share one pure helper `rangesOverlap(a, b)` in `src/lib/api/availability.ts` (half-open). This closes the gap where the exclusion constraint covers booking↔booking only and the availability endpoint merely _displays_ the merged sets.
- **Bookings render from the snapshot, never from current listing pricing.** `price` and `cleaningFee` are live-apply fields; if a host raises them between request and accept and the inbox shows current pricing, the host confirms a booking believing it is worth more than the guest was quoted — and with offline settlement that is a dispute with no system record of what the host thought they agreed to. The host inbox, accept confirmation, and every booking email read exclusively from the Booking snapshot columns, with a "price at time of request" note where it differs from current. Enforced structurally: `BOOKING_LIST_SELECT` in `booking-dto.ts` does not select listing price fields at all.
- `decline` (reason optional), guest `cancel` (PENDING or ACCEPTED until check-in), host cancel; `cancelledBy` recorded. All emit notifications transactionally. Transitions centralized in pure `src/lib/api/booking-state.ts` (`canTransition(from,to,actor)`).
- **Cron**: `vercel.json` `crons: [{path: "/api/cron/bookings", schedule: "0 * * * *"}]`. Bearer-only auth, no origin check (see §Auth). Bounded: at most 100 bookings per invocation ordered by `expiresAt` asc, next run continues; logs the remaining count so a backlog is visible. Expires PENDING past expiresAt, completes ACCEPTED past checkOut. Inbox queries defensively filter expired pendings too. Pings an external heartbeat (Healthchecks.io/Better Stack) on success — the failure mode that matters is the cron silently _not_ firing, which only an absence-alert catches (and which also detects a 403 loop if the origin exemption were ever regressed).

## Messaging (Stage 3)

Lazy conversation create (upsert on bookingId at first message). `GET/POST /api/conversations/[id]/messages` (participant check; POST zod ≤2000 chars, plain-text rendering only — React text nodes, no markdown/HTML → nothing to sanitize), `POST .../read`, `GET /api/account/unread`. Message create + `lastMessageAt` in one `$transaction`. New-message email in `after()` only if recipient unread AND `lastEmailedAt` older than the unread stretch. Caps: 20 msg/min/user, 500/conversation.

**Polling discipline**: `{ refetchInterval: 5_000, refetchIntervalInBackground: false }` on the open thread, 60s on the badge, plus an idle guard dropping the thread to 30s after 5 minutes without local input (back to 5s on focus or keypress). Background tabs must not poll.

## Abuse & lifecycle

- **Reports**: report button on public listings and in message threads → `/admin/reports` queue with resolve. Two details, since `targetId` is polymorphic and has no referential integrity: the queue must render a missing target as "content no longer available" and **still allow resolution** (a reported listing can be archived, a reported message can cascade away with its booking — otherwise the queue accumulates rows that crash the page). And `targetType: 'message'` means admins read private correspondence, which is necessary for moderation but must not be silent: write an AdminLog entry with the conversation id in metadata whenever an admin opens a reported thread. One insert, and it's the difference between an auditable moderation tool and unlogged access to user messages.
- **Account deletion → anonymisation** (never row delete, since `Booking→User` is Restrict): null `name`/`image`/`phone`, replace email with `deleted+<cuid>@irayon.invalid`, set `suspendedAt`, bump `sessionVersion`, archive their listings. Booking history survives as the support/legal record it exists to be. Endpoint may ship after Stage 3, but the FK choices are made now with this path in mind.
- Admin user management: suspend, revoke sessions (`POST /api/admin/users/[id]/...`).

## Email (Resend) — Stage 1 skeleton

`src/lib/email/send-email.ts`: `sendEmail({to, template, locale, data})`; driver resolved once — `EMAIL_DRIVER ?? (RESEND_API_KEY ? 'resend' : 'log')`. Templates: `@react-email/components` in `src/lib/email/templates/*.tsx` + az/ru/en strings in `email-strings.ts` (separate from next-intl app messages). Locale = recipient's preferredLocale. Always called inside `after()`. Email is always a layer on top of a `Notification` row, never the sole channel.

**Fail loudly when the driver resolves to `log` in production** — otherwise a missing `RESEND_API_KEY` produces no error, no failed send, and nothing for the "email send failures" signal to catch; every notification goes quietly to stdout. But **do not throw at module load**: `next build` runs with `NODE_ENV=production` and `build:ci` builds without the key, so a load-time throw fails every CI and Vercel build. Throw on the first send attempt instead (or guard with `NEXT_PHASE !== 'phase-production-build'`, the same escape [prisma.ts:25](src/lib/prisma.ts#L25) uses) — the failure then lands in the observability signal that exists for it. An explicit `EMAIL_DRIVER=log` in production stays available as a deliberate incident-time mute; it just can't happen by omission.

**Trigger matrix**: S1 listing-approved/rejected; S2 booking-requested/accepted/declined/expired/cancelled; S3 message-new (debounced).

## Rate limiting (Upstash) — Stage 1

Keep the existing interface in [src/lib/rate-limit.ts](src/lib/rate-limit.ts) (`checkRateLimit`, `getClientIp`, `rateLimitHeaders`) — make it async, delegate to `@upstash/ratelimit` sliding window when `UPSTASH_REDIS_REST_URL/TOKEN` are set, else the current in-memory Map (dev/CI). Buckets: adminLogin 5/min/IP, calls 30/min/IP (keep) + bookingCreate 5/h/user, messageSend 20/min/user, imageUpload 30/h/user, listingCreate 5/day/user, hostAction 60/min/user, signin 10/min/IP.

**Create the Upstash database in the same region as the deployment** — `ap-northeast-1`, matching the `hnd1` Vercel pin and Supabase. From another region an Upstash REST round-trip can cost more than the pooled `SELECT` it replaces, making the session cache a pessimisation that looks like an optimisation. Note the expectation in `.env.example` beside the URL, and put cache hit/miss ratio and p95 latency in the observability set — if it isn't measurably faster than the direct read, delete it and keep `React.cache()` alone, which is free.

## Image pipeline

Already shipped and staying: content-based magic-byte sniffing ([storage.ts:24-66](src/lib/storage.ts#L24-L66)), 5 MB cap, server-generated UUID object keys, client-side worker compression. **Gaps to close in Stage 1:**

- **Strip EXIF via server-side re-encode (`sharp`)** — phone photos carry GPS of where they were taken, which for a rental listing is frequently the host's home, published at metre precision regardless of any address-precision policy. Client-side canvas re-encoding drops EXIF today but is trivially bypassed by posting to the API directly, so this must happen server-side.
- **Dimension cap** on output (longest edge 2560px) alongside the byte cap; normalize output format.
- **Count caps** (currently absent): 10 files/request, 30 images/listing, on both the admin and new host routes.

## Security checklist

Ownership 404s everywhere (`where: {id, hostId}` — no existence oracle); moderation unbypassable via the single `publicListingWhere` choke point + `.strict()` schemas + fail-closed column default + derived image state; matcher hole fixed + per-page auth; fail-closed on missing AUTH_SECRET/CRON_SECRET (email/rate-limit degrade open but loud); `requireSameOrigin` on all user-initiated mutations, cron exempt by design; plain-text message rendering; generic 500s via existing `apiServerError` (audit that new handlers don't leak Prisma text); revoke/suspend terminate sessions and block re-sign-in; no self-booking.

## Observability (currently absent — "production-grade" needs a way to know when it isn't)

| Signal                                                                                | Why                                                                     |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `23P01` exclusion conflicts                                                           | the concurrency invariant firing; a spike means the pre-check is broken |
| Email send failures (Resend non-2xx, driver-resolved-to-log in prod, `after()` throw) | otherwise silent and user-visible                                       |
| Rate-limit rejections by bucket                                                       | distinguishes abuse from a limit set too tight                          |
| Break-glass login attempts (success **and** failure)                                  | should page someone                                                     |
| Cron outcome + counts expired/completed + remaining backlog                           | plus the absence-alert heartbeat                                        |
| Session cache hit/miss + p95 latency                                                  | decides whether the Upstash layer earns its place                       |
| Prisma pool-wait p95 / pool timeouts                                                  | leading indicator for the `connection_limit` question below             |

## Performance

The **build-time** rule in [src/lib/prisma.ts:14-21](src/lib/prisma.ts#L14-L21) is untouched: never raise `connection_limit` for `next build` (multiple workers each construct a pool and overrun pgbouncer — raise `pool_timeout` only). The **runtime** `connection_limit=5` is a separate knob that predates bookings, host dashboards, and polling; re-derive it from the actual pooler budget and measured p95 pool-wait rather than inheriting it. Until measured, treat pool saturation as the top scalability risk. Only interactive tx is booking-accept (short). Host inbox/dashboard: single `findMany` with narrow selects (`BOOKING_LIST_SELECT`) + `groupBy` counts — no N+1. Public surfaces keep ISR/CDN; availability 60s CDN; all private APIs `private, no-store` centrally in middleware.

## Testing & CI

Mock-data path preserved: new `bookings-service.ts`/`conversations-service.ts` facades dual-path to mocks; CI gets a dummy `AUTH_SECRET`; `build:ci` stays green (which is why the email driver must not throw at import). Vitest, existing patterns incl. `DeepMockProxy<PrismaClient>`:

- `booking-state` transition matrix; `rangesOverlap` incl. back-to-back `checkout == checkin`; expiry-floor math; `startOfDayBaku` against a fixed clock with a non-Baku `TZ`.
- `isSignificantEdit` field matrix — especially `phone`, and **a payload whose lat/lng differ only by float noise asserting `false`**: that single test protects the whole live-apply design.
- **Image state machine** (newer than `isSignificantEdit` and no simpler — 3 states × 2 lifecycles on the write side): upload on PENDING → LIVE, on APPROVED → PENDING_ADD, by admin → LIVE in both; delete on PENDING → row removed, on APPROVED → PENDING_REMOVE and still publicly visible; approve PENDING_ADD→LIVE and PENDING_REMOVE→deleted with order recomputed; reject PENDING_ADD→deleted and PENDING_REMOVE→LIVE; public select returns LIVE and PENDING_REMOVE but never PENDING_ADD; approve refused when the resulting LIVE set would be empty.
- Admin-path parity: same edit through `requireAdmin()` applies live and never populates `pendingChanges`.
- `auth-helpers` (role/suspension/sv, cache invalidation, cookie-expiring `invalidSession`), suspended-user `signIn` rejection, `rate-limit` fallback, updated `use-booking-calculator`, middleware dotted-path regression.

**One real-Postgres integration test** (Testcontainers locally / Supabase branch in CI): seed a listing and two overlapping PENDING bookings, fire both accepts concurrently, assert exactly one succeeds and the other surfaces 409 via the `23P01` path. The concurrency invariant is the single most important correctness property in the system and `DeepMockProxy` reproduces neither the exclusion constraint nor `FOR UPDATE` — mocks cannot test it at all. Everything else keeps using mocks.

## Work breakdown (PR series)

**Stage 1 (~8 PRs):**

- 1.1 infra: M1 migration (incl. default flip + `images.moderation_state`), admin-create/seed explicit APPROVED, backfill script, rate-limit Upstash swap (+ region co-location), email skeleton (fail-loud at send, not import), sharp/EXIF + dimension + count caps on uploads, `.env.example`
- 1.2a auth core, purely additive, gates nothing: `auth.config.ts`, `auth.ts`, `[...nextauth]`, `auth-helpers.ts` (+caching, `invalidSession`, suspended-signIn rejection), signin page (incl. `reason=` messaging), user-menu
- 1.2b **the lockout-risk PR, ships alone, reverts cleanly**: middleware rewrite, matcher allowlist fix, per-page `requireAdmin()`, break-glass gating
- 1.2c mechanical: migrate 24 admin handlers `admin-auth` → `auth-helpers` + `requireSameOrigin`
- 1.3 form refactor → `src/components/listing-form/` with mode/endpoints props
- 1.4 host cabinet: layout/pages, `/api/host/listings/*`, shared update service taking `actor`, `HOST_SIGNUP_ENABLED` + `HOST_SIGNUP_ALLOWLIST` gate, hooks, i18n az/ru/en
- 1.5 moderation: `listing-moderation.ts` (`isSignificantEdit` w/ fixed-precision coords, `nextImageState`, `markImageForRemoval`) + tests, `/admin/moderation` + approve/reject incl. image transitions and the empty-set guard, reorder semantics, `publicListingWhere` update, hide-fake-stars
- 1.6 contract: `host_id NOT NULL` (after prod backfill verified)

**Stage 2 (~5 PRs):** 2.1 M3 migration (bookings + blocks + notifications) + booking service/state/validator/dto + `availability.ts` + Baku TZ helpers (+tests, incl. the Postgres integration test) → 2.2 booking/availability/blocks API routes with transactional notifications + emails → 2.3 bounded cron (bearer-only, heartbeat) → 2.4 guest UI (booking-card rework, account pages, unread badge) → 2.5 host UI (inbox rendering snapshot pricing, calendar, host profile).

**Stage 3 (~3 PRs):** 3.1 M4 + conversations/messages/reports service+API → 3.2 thread UI + disciplined polling hooks → 3.3 debounced message emails, `/admin/reports` (dangling-target handling + AdminLog on thread access), `/admin/users` (suspend/revoke), anonymisation path.

**New env vars:** S1 — AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ADMIN_EMAIL, ADMIN_BREAK_GLASS, HOST_SIGNUP_ENABLED, HOST_SIGNUP_ALLOWLIST, UPSTASH_REDIS_REST_URL/TOKEN, RESEND_API_KEY, EMAIL_FROM, EMAIL_DRIVER. S2 — CRON_SECRET, CRON_HEARTBEAT_URL.

## Verification

Per stage: `pnpm format:check && pnpm typecheck && pnpm lint && pnpm test && pnpm build:ci`. Migration dry-run against a Supabase branch before prod (`prisma migrate deploy` with DIRECT_URL). Manual E2E:

- **S1**: Google sign-in → B1 backfill → next request expires the stale cookie and redirects to sign-in → sign in again → `/admin` works. Become a host (via allowlist, public signup still closed) → create listing (PENDING, invisible publicly) → admin approves (email + notification + listing live + ISR busted). Edit price → applies live and revalidates. Edit **only** price on a listing with map-widget coordinates → still applies live (float-noise regression). Edit phone or swap a photo → stays pending, public page unchanged until approved. Delete all photos then approve → refused. Same edits performed **as admin** → apply live, never queued. Second listing while first is pending → blocked for an unproven host. Suspend a user → their next request signs them out and re-sign-in is refused. Break-glass works only with `ADMIN_BREAK_GLASS=true`. `/admin/a.b` → 401/redirect, not a render. Upload a GPS-tagged phone photo → stored file has no EXIF.
- **S2**: same-day booking request → not born expired, host has ≥2h. Two concurrent accepts on overlapping requests → exactly one wins, the other 409s. Host blocks dates over an accepted booking → 409. Host raises price after a request → inbox and emails still show the quoted snapshot. Accept → guest sees an in-app notification with email disabled. Cron runs (no 403), expires stale pendings, pings the heartbeat.
- **S3**: message both directions, unread badges, one debounced email per unread stretch, third account gets 404 on the thread, report reaches `/admin/reports`, resolving a report whose target was deleted still works, admin opening a reported thread writes an AdminLog row.
