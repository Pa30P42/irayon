# Go-live plan — connecting the external services

Everything in the marketplace is built and runs today with **no external service
connected**: Upstash falls back to an in-memory limiter, Resend to a `log` driver, and
sign-in to the dev-only email form. This document turns that into a production
deployment.

It is a runbook, not a checklist of settings — the order matters in three places, and
each phase has a way to tell whether it worked and a way back if it didn't.

---

## 0. Decide the region first

**This is the one item that is not just configuration, and it should be settled before
anything else is provisioned.**

|                  | Current                    |               |
| ---------------- | -------------------------- | ------------- |
| Vercel functions | `hnd1` (Tokyo)             | `vercel.json` |
| Database         | `eu-central-1` (Frankfurt) | Supabase      |

Every query currently crosses ~9,000 km. At roughly 250 ms per round trip, a page doing
three sequential queries spends most of a second waiting on the network — and the
booking accept path holds a row lock while it does.

For an Azerbaijani audience, Tokyo is also the wrong place on its own terms: Baku is
~3,000 km from Frankfurt and ~7,500 km from Tokyo.

**Recommendation: move the functions to Frankfurt** and keep the database where it is.

```jsonc
// vercel.json
"regions": ["fra1"]
```

Then provision **Upstash in `eu-central-1` too**, so all three sit together.

If you would rather keep `hnd1`, the database has to move instead — but nothing about
this product argues for Tokyo, and the comment in `.env.example` recommending
`ap-northeast-1` for Upstash was written when the database was there. Update it either
way so the next person isn't misled.

**Verify:** after deploying, watch `session_cache` log lines and any Prisma pool
warnings. The plan's stated bar for the Upstash session cache is that it must be
measurably faster than a direct read — co-location is what makes that true.

---

## 1. Production database

The application currently points at a branch database. Decide whether that becomes
production or whether a separate project does.

Nine migrations exist. A production database that last saw the pre-marketplace schema
needs the last five:

```
20260810000100_marketplace_m1              users, host_id, moderation
20260810000200_marketplace_m2_host_required  host_id NOT NULL
20260811000100_marketplace_m3_bookings     bookings, blocks, notifications, btree_gist
20260811000200_marketplace_m4_messaging    conversations, messages, reports
20260811000300_per_recipient_email_debounce
```

```bash
pnpm prisma:status          # confirm what's pending
pnpm prisma:deploy          # apply — uses DIRECT_URL, never the pooler
```

**Three things to know before you run it:**

- **M1 backfills visibility.** `moderationStatus` is added with `DEFAULT 'approved'` so
  existing listings stay public, then flipped to `'pending'` as the migration's last
  statement. Existing rows are safe; everything created afterwards is invisible until
  reviewed.
- **M2 will fail loudly if any listing has no host.** That's deliberate — it raises a
  named exception telling you to run the backfill. See §3.
- **`prisma migrate diff` proposes dropping two indexes that must not be dropped**
  (`listings_search_text_trgm_idx`, `listings_slug_prefix_idx`) and the booking overlap
  exclusion constraint. They're raw SQL that Prisma can't see. Never apply a generated
  diff without reading it.

**Verify:**

```sql
-- the fail-closed default took
SELECT column_default FROM information_schema.columns
 WHERE table_name='listings' AND column_name='moderationStatus';   -- 'pending'
-- existing listings kept their visibility
SELECT "moderationStatus", count(*) FROM listings GROUP BY 1;      -- all approved
-- the concurrency invariant exists
SELECT conname FROM pg_constraint WHERE conname='bookings_no_accepted_overlap';
```

**Rollback:** migrations M1–M4 are additive; M2 is the only one that constrains
(`host_id SET NOT NULL`) and is reversed with `ALTER TABLE listings ALTER COLUMN
"hostId" DROP NOT NULL`.

---

## 2. Google OAuth

Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** →
Web application.

Authorised redirect URIs — add **both**, or preview deployments break:

```
https://irayon.az/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

Then in Vercel (Production):

```
AUTH_SECRET=<openssl rand -base64 32>      # ≥32 chars; middleware 503s without it
AUTH_GOOGLE_ID=<client id>
AUTH_GOOGLE_SECRET=<client secret>
ADMIN_EMAIL=<the Google account that owns the platform>
```

**And confirm `AUTH_DEV_LOGIN` is absent or `false` in production.** It is already
double-gated — the provider is never registered when `NODE_ENV=production`, so shipping
the variable by accident cannot open a passwordless login — but leaving it set is
misleading to the next reader.

**Verify:** `/az/signin` shows a Google button and no dev form. Sign in. `/api/account/me`
returns your user. Sign out and back in.

**Rollback:** unset `AUTH_GOOGLE_ID`/`SECRET` — the button disappears and the app keeps
running. Nobody can sign in, but nothing breaks.

---

## 3. Promote the admin — ORDER MATTERS

This sequence has a trap in it, and doing the steps out of order strands you.

1. **Sign in with Google once, as `ADMIN_EMAIL`.** The Auth.js adapter creates your
   `users` row naturally. Do not create it by hand: we deliberately don't enable
   `allowDangerousEmailAccountLinking`, so a hand-made row with no linked account would
   make your first real sign-in fail with `OAuthAccountNotLinked`.

2. **Run the backfill** against production:

   ```bash
   pnpm backfill:admin-host
   ```

   It promotes you to `ADMIN`, moves the catalogue onto your account, deletes the seed's
   placeholder host, and bumps your `sessionVersion`.

3. **You will be signed out on your next request. This is intended.** Edge middleware
   reads `role` from the JWT, which still says `user`. The `sessionVersion` bump makes
   the next server-side check fail, which expires the cookie and redirects you to
   sign-in. Sign in again and you come back with an admin token.

**Verify:** `/admin/listings` loads, the catalogue is listed, and `/admin/logs` shows
your name in the Admin column.

**If step 2 errors** with "No user found for ADMIN_EMAIL", step 1 didn't happen — check
you signed in with exactly that address.

---

## 4. Resend

**Read this before setting the key: email stops being optional the moment you deploy to
production.**

The driver resolves as `EMAIL_DRIVER ?? (RESEND_API_KEY ? 'resend' : 'log')`, and
resolving to `log` in production **throws on the first send**. That is deliberate — a
silently muted notification system is worse than a loud failure — but it means a
production deploy without either `RESEND_API_KEY` or an explicit `EMAIL_DRIVER=log`
will start throwing inside `after()` as soon as anyone approves a listing.

So: set one of the two before the first production deploy.

1. resend.com → add and verify the sending domain (DNS: SPF + DKIM).
2. Create an API key.
3. In Vercel:

   ```
   RESEND_API_KEY=re_...
   EMAIL_FROM="irayon <noreply@irayon.az>"
   ```

`EMAIL_FROM` must be on the verified domain or every send fails.

**Verify:** approve a pending listing (or make a booking request) and confirm the mail
arrives. Then check the logs contain **no** `email_send_failed` lines.

**Rollback:** set `EMAIL_DRIVER=log`. Sends become log lines again, deliberately and
visibly, rather than by omission. This is also the incident-time mute if Resend has an
outage.

---

## 5. Upstash

Console → Redis → Create database, **in the same region as the functions** (see §0).
Copy the **REST** URL and token — not the Redis protocol URL.

```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

This switches two things at once:

- rate limiting, from a per-instance in-memory Map to a durable sliding window;
- the session strict-check cache, which gains a 60 s TTL across requests.

**A documented bound comes with it:** if the invalidating `DEL` on revoke/suspend fails,
enforcement is delayed by up to 60 s. Every mutation passes `force: true` and skips the
cache entirely, so this affects reads only.

**Verify:** `session_cache` lines appear with `hit`/`miss` and a `ms` figure. Exceed a
limit deliberately (six failed break-glass logins, or six booking requests in an hour)
and confirm the 429 persists across page loads rather than resetting.

**The bar this has to clear:** if cache hits aren't measurably faster than the direct
read, delete the layer and keep `React.cache()` alone, which is free. Co-location (§0)
is what decides this.

**Rollback:** unset both variables. The limiter falls back to in-memory and the session
cache disappears. No code change, no deploy.

---

## 6. Cron

Vercel reads `vercel.json` and schedules `/api/cron/bookings` hourly. Set:

```
CRON_SECRET=<openssl rand -base64 32>       # ≥16 chars, fails closed
```

Vercel sends it as `Authorization: Bearer` automatically. Nothing else to wire.

Optional but recommended:

```
CRON_HEARTBEAT_URL=https://hc-ping.com/<uuid>
```

**The failure mode that matters is the cron silently not firing** — no error, no log
line, just requests that never expire. Only an external absence-alert catches that.
Configure the monitor to expect a ping roughly hourly and to alert after two misses.

**Verify:** Vercel → Deployments → Cron. After the first run, look for a
`cron_bookings_done` line with its counts, and confirm the heartbeat registered. Then
create a booking request, move its `expiresAt` into the past, and watch the next run
expire it.

**Rollback:** remove the `crons` block from `vercel.json`. Bookings then stop expiring
and completing — degraded, not broken.

---

## 7. Remaining production settings

```
NEXT_PUBLIC_SITE_URL=https://irayon.az     # anything else ⇒ noindex everywhere
ADMIN_BREAK_GLASS=false                    # leave off; arm only during an incident
HOST_SIGNUP_ENABLED=false                  # keep closed at first
HOST_SIGNUP_ALLOWLIST=<admin>,<one test account>
```

**The SEO gate is a real switch**, not decoration: any hostname other than `irayon.az`
makes `robots.txt` `Disallow: /`, empties the sitemap, and adds `noindex` to every page.
That's the right behaviour for previews; it means you must set the real value in
Production or the live site stays invisible to search engines.

Keep the old `ADMIN_LOGIN`/`ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` set — they're inert
while `ADMIN_BREAK_GLASS=false`, and they are your way back in if Google auth breaks.

---

## 8. Opening host signup

Do this **last**, and as its own change.

While `HOST_SIGNUP_ENABLED=false`, only the allowlist can become hosts — which is what
lets you run the whole flow against real infrastructure with real email and real OAuth
before anyone else can. Walk it once end to end:

- become a host → create a listing → it's PENDING and invisible
- approve it → the approval email actually arrives
- a guest requests it → the host gets a real email
- accept → the guest gets one

Then, and only then:

```
HOST_SIGNUP_ENABLED=true
```

One environment variable, on a path that has already been exercised.

---

## Order of operations

The dependencies are real; the rest is preference.

```
0. region decision ─────────────► before provisioning Upstash
1. database migrations ─────────► before anyone signs in
2. Google OAuth ────────────────► before the backfill (§3 step 1)
3. admin promotion ─────────────► before using /admin
4. Resend ──────────────────────► before the first production deploy (it throws)
5. Upstash ─────────────────────► any time; no dependency
6. cron ────────────────────────► any time; no dependency
7. site URL + gates ────────────► with the production deploy
8. open host signup ────────────► last, after a full real-service walkthrough
```

---

## What to watch afterwards

These are the signals the code already emits. Worth a saved search each.

| Log line                     | Means                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `booking_exclusion_conflict` | the concurrency invariant firing — a spike means the pre-check is broken                         |
| `email_send_failed`          | Resend refused, or `EMAIL_FROM` is unverified                                                    |
| `rate_limit_rejected`        | with `durable: false` after Upstash is set ⇒ the fallback is active, i.e. Upstash is unreachable |
| `rate_limit_backend_failed`  | Upstash erroring; limiting has degraded open                                                     |
| `admin_break_glass_login`    | someone used the emergency login — this should page you                                          |
| `cron_bookings_done`         | plus its `remaining*` counts; a growing backlog is visible here                                  |
| `session_cache`              | hit/miss and latency — decides whether Upstash earns its place                                   |

---

## Rollback summary

Nothing in this plan is one-way.

| Service      | Undo                                 | Consequence                           |
| ------------ | ------------------------------------ | ------------------------------------- |
| Google OAuth | unset `AUTH_GOOGLE_*`                | nobody can sign in; app runs          |
| Resend       | `EMAIL_DRIVER=log`                   | emails become log lines               |
| Upstash      | unset both vars                      | in-memory limiter, no session cache   |
| Cron         | remove `crons` from `vercel.json`    | bookings stop expiring                |
| Host signup  | `HOST_SIGNUP_ENABLED=false`          | allowlist only                        |
| Break-glass  | `ADMIN_BREAK_GLASS=true`             | emergency admin login, if OAuth fails |
| M2 migration | `DROP NOT NULL` on `listings.hostId` | listings may be unowned again         |
