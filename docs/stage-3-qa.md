# Stage 3 — manual QA checklist

Messaging, reports, user management, account deletion.

## Already proven

Verified over HTTP against the real database: a third party gets 404 on both opening
and reading a thread; an `<img onerror>` payload round-trips as text; the email
debounce sends one message per unread stretch and a fresh one after a read; suspension
kills the session immediately **and** blocks re-authentication; an admin can't be
suspended; reading a reported thread writes an audited log entry; a dangling report
renders and resolves; anonymisation leaves nothing identifying behind.

**Unverified: the browser.** The thread widget, the polling behaviour, and the admin
tables.

## Setup

Two browsers again (guest + host). Accounts are the same, plus `victim@example.com`
which is **left suspended on purpose** so `/admin/users` has a real row to look at.

---

## A. Messaging — the basics

As `guest@example.com`, make a booking request, then on `/az/account/bookings`:

- [ ] Each booking has a **Message** button
- [ ] Clicking it opens a thread at `/az/account/messages/<id>`
- [ ] Send a message → it appears immediately, right-aligned, in the accent colour
- [ ] **Enter sends. Shift+Enter adds a newline** without sending
- [ ] The character counter moves and stops at 2000

As `testhost@example.com` on `/az/host/messages`:

- [ ] The thread is listed with the guest's name and the listing
- [ ] It shows an unread dot
- [ ] Open it → the guest's message is left-aligned; yours are right-aligned
- [ ] Reply → the guest's window shows it **within about 5 seconds**, without a reload

## B. Polling discipline

This is the part most worth watching, because getting it wrong is invisible until
it's expensive.

- [ ] With a thread open, devtools → Network → filter `messages`. A request roughly
      every **5 seconds**
- [ ] Switch to another tab and wait ~30s. Come back and look at the request
      timestamps — **there should be no requests from while the tab was hidden**
- [ ] Leave a thread open and untouched for 5+ minutes → the interval stretches to
      ~30s
- [ ] Click or type in the page → it snaps back to ~5s

## C. Unread counts

- [ ] The header badge shows a count when you have unread messages
- [ ] Opening the thread clears it (both the badge and the dot in the list)
- [ ] Send a message and **do not open it** in the other window — the badge stays

## D. Message emails

Watch the `pnpm dev` terminal for `"template":"message-new"` lines.

- [ ] Guest sends one → an email to the host
- [ ] Host replies → an email to the guest. **This one is the regression test.** The
      first implementation shared one debounce marker per thread, so this email was
      silently suppressed
- [ ] Host sends three more without the guest reading → **no further emails**
- [ ] Guest opens the thread, host sends again → **one new email**

## E. Reports

As a guest:

- [ ] A **Report** button on a listing page (signed in only — signed out it's absent)
- [ ] Reporting opens a dialog with a reason dropdown and an optional note
- [ ] Submitting shows a confirmation
- [ ] Reporting the same listing again → "you've already reported this"
- [ ] In a thread, the other party's messages have a small **Report** link; your own
      do not

As admin on `/admin/reports`:

- [ ] The report appears, oldest first, with reporter, reason, and note
- [ ] For a reported **message**, a warning says opening the thread is logged
- [ ] Click **Open thread (logged)** → the conversation appears with the reported
      message highlighted
- [ ] `/admin/logs` now has a `report.thread.read` row **naming you**
- [ ] Resolve with a note → it leaves the open queue
- [ ] **Show resolved** brings it back with a ✓ and your resolution

## F. Users

`/admin/users`:

- [ ] The list loads; search by email or name filters it
- [ ] `victim@example.com` shows as **Suspended**
- [ ] **Unsuspend** it, then confirm they can sign in again
- [ ] **Suspend** them again while signed in as them in the other browser →
      their very next click signs them out
- [ ] Try to suspend **yourself** (the admin) → refused with a clear message
- [ ] **Revoke sessions** on a signed-in user → they're signed out but can sign
      straight back in

## G. Audit trail

- [ ] `/admin/logs` has an **Admin** column, populated with names
- [ ] Recent actions are attributed: `user.suspend`, `report.resolve`,
      `report.thread.read`, `listing.moderation.approve`

## H. Localisation and layout

- [ ] Messages, reports, and users pages in all three locales — no raw keys
- [ ] The thread at ~375px: bubbles wrap, the composer stays reachable
- [ ] `/admin/reports` at ~375px: the thread preview scrolls inside its own box

---

## Known and expected

- **Account deletion has no UI button.** `POST /api/account/delete` works and is
  tested, but nothing on the settings page calls it yet — deliberate, since it's
  irreversible and deserves its own confirmation flow. Add the button when you want
  it exposed.
- Admins have no messaging role by design: an admin is not a participant, and reading
  correspondence goes through the audited report path only.
- Emails still go to the terminal; sign-in is still the dev form.

## Reset

```bash
pnpm prisma:studio   # clear messages/conversations/reports/bookings by hand
```

or start clean with `pnpm prisma:reset && pnpm prisma:seed` (see the Stage 1 doc for
the sign-in → backfill sequence).
