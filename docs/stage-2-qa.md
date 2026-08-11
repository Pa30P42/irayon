# Stage 2 — manual QA checklist

Bookings: request → accept/decline → cancel, availability, host calendar, cron.

## What's already proven, and what isn't

Verified against the real database and over HTTP: the concurrency invariant (two
simultaneous accepts, three rounds, exactly one winner each — and the winner varied),
snapshot pricing surviving a mid-request price change, self-booking and duplicate
requests refused, past dates refused in Baku time, blocks colliding with accepted
bookings refused, the cron expiring only what it should.

**Unverified: the browser.** The calendar widget, the two half-open date conversions
around it, and how any of this looks on a phone.

## Setup

```bash
pnpm dev
```

Same accounts as Stage 1. You need **two** browsers (or one plus a private window) —
the interesting parts need a guest and a host at the same time:

| Email                  | Use as                                           |
| ---------------------- | ------------------------------------------------ |
| `guest@example.com`    | the guest making requests                        |
| `testhost@example.com` | the host receiving them (owns `test-host-cabin`) |

Keep the `pnpm dev` terminal visible — every email prints there as an `email_logged`
line.

---

## A. Guest — making a request

On `/az/listings/test-host-cabin`, signed out:

- [ ] The booking card shows a price and a **Sign in to book** button
- [ ] Clicking it lands on sign-in, and after signing in you come back to **this
      listing**, not the homepage

Now signed in as `guest@example.com`:

- [ ] Open the date picker — past dates are greyed out
- [ ] Pick a range → guest count, note field, and a price breakdown appear
- [ ] The breakdown adds up: nights × price + cleaning fee. If the fee is 0 the row
      is hidden entirely rather than showing "0"
- [ ] The line under the button says this isn't an instant booking
- [ ] Send the request → the card is replaced by a confirmation with a link to your
      bookings
- [ ] Terminal shows an `email_logged` line for `booking-update` to the **host**

Negative cases:

- [ ] Request the same dates again → _"You already have a pending request"_
- [ ] Sign in as `testhost@example.com` and try to book **their own** listing →
      refused, in Azerbaijani, not raw English

## B. Guest — managing bookings

`/az/account/bookings`:

- [ ] Your request is listed with dates, nights, guests, **Pending**, and the total
- [ ] A "respond by" timestamp shows on pending requests
- [ ] Cancel → confirm dialog → the row becomes **Cancelled**
- [ ] The Cancel button disappears once cancelled

`/az/account/settings`:

- [ ] Name, phone, notification language save and survive a reload
- [ ] **Email is greyed out and not editable**
- [ ] Set language to Russian, then have the host accept a booking → the email in the
      terminal is in Russian

## C. Host — the inbox

Signed in as `testhost@example.com` at `/az/host/bookings`:

- [ ] The four tabs work: Pending / Upcoming / Past / All
- [ ] A pending request shows the guest's name, the note they wrote, and a
      **respond-by** time
- [ ] The total is labelled **"price at time of request"**
- [ ] **Accept** → the request moves from Pending to Upcoming
- [ ] Terminal shows a `booking-update` email to the **guest**
- [ ] The guest's `/az/account/bookings` now shows **Confirmed**
- [ ] The header badge on the guest's window shows an unread count

Decline and cancel:

- [ ] Make a second request, then **Decline** it with a reason → the guest sees the
      reason on their bookings page
- [ ] Accept a third, then **Cancel** it as the host → confirm dialog, then Cancelled

**The pricing test — the one worth doing carefully:**

- [ ] With a request pending, go to `/az/host/listings/<id>/edit` and **raise the
      price**, save
- [ ] Return to `/az/host/bookings` → the pending request still shows the **original**
      total, not the new one
- [ ] Accept it → the confirmation and the guest's page both still show the original
- [ ] The listing page itself shows the new price to new visitors

## D. Availability

- [ ] With a booking **accepted**, open the listing's date picker as a guest → those
      nights are greyed out
- [ ] **The checkout day is still selectable.** If the stay is 5th–8th, the 8th must
      be bookable — that's a turnover day, not a taken night. This is the single most
      likely place for an off-by-one to hide
- [ ] Cancel the booking → the nights become selectable again

## E. Host calendar

`/az/host/calendar`:

- [ ] The listing dropdown lists your listings; switching clears the selection
- [ ] Select a range, add a note, **Block dates**
- [ ] The list shows the range you actually closed — block the 20th to the 22nd and
      it should read **20 → 22**, not 20 → 23
- [ ] Those days are now greyed out in the calendar above
- [ ] The same dates are greyed out for guests on the public listing page
- [ ] **Unblock** → they come back
- [ ] Try to block dates covering an **accepted** booking → refused with "there is a
      confirmed booking on those dates"

## F. Public host profile

- [ ] `/az/hosts/<hostId>` opens **while signed out** and shows the host's name, join
      year, and their live listings
- [ ] It does **not** show their email or phone
- [ ] A made-up id renders the not-found page

## G. Cron

```bash
SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'"' -f2)
curl -s http://localhost:3000/api/cron/bookings                                  # 401
curl -s -H "Authorization: Bearer $SECRET" http://localhost:3000/api/cron/bookings
```

- [ ] Without a token: 401. With it: a JSON summary
- [ ] Terminal shows a `cron_bookings_done` line with counts

To watch it actually expire something, make a request and then move its `expiresAt`
into the past with `pnpm prisma:studio`, and run the cron again.

## H. Localisation and layout

- [ ] Booking card, `/account/bookings`, `/host/bookings`, `/host/calendar` in all
      three locales — no raw keys like `host.bookings.title`
- [ ] The date picker at ~375px doesn't overflow the card
- [ ] The host inbox at ~375px — buttons wrap rather than pushing the page sideways

---

## Known and expected

- **`/az/host/bookings` as a non-host returns HTTP 200**, not a 3xx. The redirect
  still happens — Next resolves it client-side because the page shell had already
  streamed. Same for a bogus host profile: 404 content, 200 status.
- Messages, reports, `/admin/users` are Stage 3 and absent.
- Emails go to the terminal, rate limiting is in-memory, sign-in is the dev form —
  all three connect at the end.

## Reset

```bash
pnpm dev  # then, in another shell:
```

Clear test bookings/blocks with `pnpm prisma:studio`, or drop everything and start
over with `pnpm prisma:reset && pnpm prisma:seed` (see the Stage 1 doc for the
sign-in → backfill sequence that follows).
