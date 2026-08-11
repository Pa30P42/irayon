# Stage 1 — manual QA checklist

## What this covers, and what it doesn't

Server logic is already exercised: 278 automated tests, plus a live API pass against the
real database (auth, session revocation, host signup gate, live-apply vs queued edits,
the photo state machine, EXIF stripping, approve/reject).

**What has never been opened in a browser is the UI.** Forms, the image uploader, the
moderation page layout, three locales, and mobile widths. That is where the risk is, so
that is what this list concentrates on.

## Setup

```bash
pnpm dev          # http://localhost:3000
```

Accounts already in the database (sign in at `/az/signin` — the dev-only email form;
there is no password, and no Google button because OAuth isn't connected yet):

| Email                  | Role         | Notes                                        |
| ---------------------- | ------------ | -------------------------------------------- |
| `hajiev93@gmail.com`   | admin + host | owns the 13 catalogue listings               |
| `testhost@example.com` | host         | owns `test-host-cabin`, allowlisted          |
| `guest@example.com`    | plain user   | **not** allowlisted — use for negative tests |

Any other email you type creates a fresh non-allowlisted user, which is useful.

Keep the terminal running `pnpm dev` visible — emails print there as `email_logged`
lines instead of being sent.

---

## A. Public site — regression

Nothing here was meant to change except the stars. If something else looks different,
that's a bug.

- [ ] `/` redirects to `/az`
- [ ] Homepage: featured listings, regions grid, map teaser all render
- [ ] `/az/listings` — filters, map toggle, sort, infinite scroll all still work
- [ ] `/az/listings/[slug]` — gallery, amenities, map, booking card, call button
- [ ] Language switcher keeps you on the same page in `ru` and `en`
- [ ] `/robots.txt` and `/sitemap/listings.xml` still respond

**New behaviour — fake ratings are hidden:**

- [ ] Seeded listings (`reviewCount > 0`) still show a star and a score
- [ ] `test-host-cabin` (`reviewCount === 0`) shows **no star anywhere** — not on the
      catalogue card, not in the list row, not in the detail header
- [ ] The detail header still shows the address when the star is hidden (no stray `·`)

## B. Auth

- [ ] Logged out: header shows a **Sign in** button
- [ ] `/az/signin` shows only the dev form. No Google button, and no crash
- [ ] Sign in as `hajiev93@gmail.com` → header shows your name, dropdown opens
- [ ] Dropdown has: My bookings, Settings, Host dashboard, **Admin panel**, Sign out
- [ ] Sign out returns you to the logged-out header
- [ ] Sign in as `guest@example.com` → dropdown has **no Admin panel** item
- [ ] Visit `/az/host` while logged out → redirected to `/az/signin?next=/az/host`
- [ ] Sign in from there → you land back on `/az/host`, not the homepage
- [ ] `/az/signin` while already signed in → bounces you away

**Known and expected:** _My bookings_ and _Settings_ 404. Those pages are Stage 2 and
Stage 3. The links exist because the menu is built once.

## C. Admin panel — regression

The whole panel moved from the old HMAC login to Google/dev sessions, and all 15 route
files were rewritten. This section is the highest-value regression sweep in the list.

- [ ] `/admin/listings` — list, search, status filter, photo counts
- [ ] `/admin/listings/new` — every section renders; map picker works; locale tabs work
- [ ] Create a listing with 2–3 photos → it saves and appears in the list
- [ ] **The uploaded image URL ends in `.webp`** (check the gallery `src` in devtools) —
      every upload is now re-encoded server-side
- [ ] Edit a listing: existing-images grid shows, reorder arrows work, "make cover"
      works, per-image delete works
- [ ] Delete a listing
- [ ] Regions: create, edit, cover upload, delete
- [ ] Villages: create, rename, delete
- [ ] Amenities: create, edit, delete
- [ ] `/admin/logs` — recent entries now carry an **admin id** instead of null
- [ ] Sign out from inside `/admin` works and lands you on the sign-in page

## D. Host cabinet

Sign in as `testhost@example.com`.

- [ ] `/az/host` — four counters, and the numbers look right
- [ ] `/az/host/listings` — `test-host-cabin` listed with an **Approved** badge
- [ ] `/az/host/listings/new` — the form is byte-for-byte the admin one
- [ ] Create a listing with photos → lands in your cabinet badged **In review**
- [ ] That listing is **not** on `/az/listings` and its detail URL 404s
- [ ] Edit the approved listing's **price** → saves, no review banner, new price is live
- [ ] Edit its **phone** or **title** → cabinet shows "changes in review", and the public
      page still shows the OLD value
- [ ] Upload a photo to the approved listing → appears in your grid, **not** on the
      public page
- [ ] Try to delete the last remaining live photo → refused with a minimum-photos message
- [ ] Host nav highlights the current section correctly

Now sign in as `guest@example.com`:

- [ ] Dropdown shows **Become a host** → `/az/host/start`
- [ ] That page shows "signup is closed" and **no** create button
- [ ] Typing `/az/host/listings/new` directly bounces you back to `/az/host/start`

## E. Moderation

Sign in as `hajiev93@gmail.com`, open `/admin/moderation`.

- [ ] The queue lists the pending listing you created in section D, oldest first
- [ ] A **new** listing shows no diff table (there's nothing to compare)
- [ ] An **edited** listing shows the diff table: _Live_ vs _Proposed_ columns, only for
      the fields that actually changed
- [ ] The photo strip shows badges on photos being added or removed
- [ ] Click **Reject** → the reason box appears; the submit button stays disabled until
      you've typed 10 characters
- [ ] Reject with a real reason → the item leaves the queue
- [ ] Sign in as that host → the rejection reason is visible on `/az/host/listings` and
      on the edit page
- [ ] Back as admin, **Approve** a pending listing → it appears on the public site, and
      any pending photo becomes visible
- [ ] Approving a listing whose photos are all flagged for removal → shows _"Cannot
      approve: the listing would be left with no photos. Reject instead."_
- [ ] Your terminal printed `"type":"email_logged"` lines with
      `listing-approved` / `listing-rejected` and the host's address

## F. Localisation

Switch to `ru` and `en` and re-open each new surface. You're looking for raw keys like
`host.dashboard.title` leaking through, and for text overflowing its container.

- [ ] `/{locale}/signin`
- [ ] `/{locale}/host` and `/{locale}/host/listings`
- [ ] `/{locale}/host/start`
- [ ] `/admin/moderation` (uses the admin locale switcher, not the URL)

## G. Security spot checks

Quick, and each one covers something that was actually broken or newly added.

- [ ] `/admin/x.y` → redirects to sign-in. **It used to render** — any path with a dot
      bypassed the gate entirely
- [ ] Copy another host's listing edit URL (`/az/host/listings/<id>/edit`) and open it as
      `guest@example.com` → **404**, not 403. A 403 would confirm the id is real
- [ ] Devtools → Network → any `/api/admin/*` response → header
      `cache-control: private, no-store`
- [ ] Sign in as `guest@example.com`, go to `/admin` → 404, not a login form

## H. Layout

- [ ] Host cabinet at ~375px wide — nav scrolls sideways, cards don't overflow
- [ ] Moderation queue at ~375px — the diff table scrolls inside its own container, the
      page itself doesn't scroll horizontally
- [ ] Sign-in page on mobile

---

## Not in scope yet

These are Stage 2 / Stage 3 and will 404 or be absent:

- `/{locale}/account/*` (bookings, settings)
- Booking requests — the booking card is still a price calculator plus a phone link
- Messaging, notifications, reports, `/admin/users`
- Real emails (driver is `log`), durable rate limiting (in-memory), Google sign-in

## If you want to start clean

```bash
pnpm prisma:reset   # DROPS EVERYTHING, re-runs all 6 migrations, re-seeds
pnpm prisma:seed
```

The seed creates a placeholder host account (`catalogue@irayon.invalid`) to own the
catalogue, because `hostId` is required and nobody has signed in yet. Then:

1. sign in once as `hajiev93@gmail.com`
2. `pnpm backfill:admin-host` — promotes you to admin, moves the catalogue onto your
   account, deletes the placeholder, and bumps your session version
3. your next request signs you out — **this is intended**; sign in again and you come
   back with an admin token
