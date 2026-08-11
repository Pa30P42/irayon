/**
 * B1 — backfill every pre-marketplace listing onto the admin's host account.
 *
 *   pnpm backfill:admin-host
 *
 * PREREQUISITE (do not skip): the admin must have signed in with Google at
 * least once, so the Auth.js Prisma adapter has created their `users` row
 * naturally. We deliberately do NOT enable `allowDangerousEmailAccountLinking`
 * — that flag is safe only while Google is the sole provider and becomes an
 * account-takeover vector the day a second one lands. So: sign in first, then
 * promote the row this script finds.
 *
 * The script is idempotent — re-running it is a no-op once everything is
 * assigned.
 *
 * RUNBOOK TRAP: edge middleware reads `role` from the JWT, which still says
 * `user` after this promotion. Bumping `sessionVersion` is what fixes that:
 * the next server-side strict check fails, `invalidSession()` expires the
 * cookie, and the admin is redirected to sign in again — coming back with a
 * token that carries `role: admin`. Without the bump the admin would sit on a
 * stale token with no way to notice.
 */
import { PrismaClient } from '@prisma/client';
import { PLATFORM_HOST_EMAIL } from '../src/lib/platform-host';

// DIRECT_URL: this is a one-shot maintenance script, not serverless traffic —
// go straight at Postgres rather than through the transaction pooler.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL is not set — cannot identify the admin account.');
  }

  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true, role: true, becameHostAt: true, sessionVersion: true },
  });

  // Fail loudly rather than creating the row ourselves: a missing row means
  // step 2 of the migration runbook (admin signs in with Google once) was
  // skipped, and a hand-made row would have no linked `accounts` entry — the
  // admin still couldn't sign in, but the failure would surface much later.
  if (!user) {
    throw new Error(
      `No user found for ADMIN_EMAIL="${adminEmail}". ` +
        'Sign in with Google using that address first, then re-run this script.',
    );
  }

  const promoted = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'ADMIN',
      becameHostAt: user.becameHostAt ?? new Date(),
      // Revoke outstanding tokens so the role change actually takes effect.
      sessionVersion: { increment: 1 },
    },
    select: { id: true, email: true, role: true, sessionVersion: true },
  });

  /**
   * Reassign the curated catalogue to the real admin.
   *
   * Before M2 this also had to sweep up `hostId IS NULL` rows, which is how
   * pre-marketplace listings arrived. That branch is gone: M2 contracted the
   * column, so the generated client types `hostId` as non-nullable and Prisma
   * rejects `{ hostId: null }` as a filter outright. The unowned state is now
   * unrepresentable, which is the whole point of the contract.
   *
   * What remains is the reserved platform account that `prisma/seed.ts` creates
   * — the seed runs before anyone has signed in, and `hostId` is NOT NULL, so
   * the curated rows need some owner until the operator exists.
   */
  const platformHost = await prisma.user.findUnique({
    where: { email: PLATFORM_HOST_EMAIL },
    select: { id: true },
  });

  const count =
    platformHost && platformHost.id !== promoted.id
      ? (
          await prisma.listing.updateMany({
            where: { hostId: platformHost.id },
            data: { hostId: promoted.id },
          })
        ).count
      : 0;

  // The placeholder can never be signed into (RFC 2606 `.invalid` address), so
  // once it owns nothing it is pure clutter. `Restrict` on the FK means this
  // deletion physically cannot succeed while any listing still points at it —
  // which is the check, not a risk.
  let placeholderRemoved = false;
  if (platformHost && platformHost.id !== promoted.id) {
    const stillOwned = await prisma.listing.count({ where: { hostId: platformHost.id } });
    if (stillOwned === 0) {
      await prisma.user.delete({ where: { id: platformHost.id } });
      placeholderRemoved = true;
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        type: 'backfill_admin_host_done',
        adminId: promoted.id,
        adminEmail: promoted.email,
        role: promoted.role,
        sessionVersion: promoted.sessionVersion,
        listingsAssigned: count,
        placeholderRemoved,
      },
      null,
      2,
    ),
  );

  // Post-condition: nothing is left on the placeholder. `Restrict` on the FK
  // already guarantees the delete above couldn't have succeeded otherwise, so
  // this only catches the case where the delete was skipped.
  if (platformHost && !placeholderRemoved && platformHost.id !== promoted.id) {
    const stranded = await prisma.listing.count({ where: { hostId: platformHost.id } });
    if (stranded > 0) {
      throw new Error(
        `${stranded} listing(s) are still owned by the platform placeholder account.`,
      );
    }
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
