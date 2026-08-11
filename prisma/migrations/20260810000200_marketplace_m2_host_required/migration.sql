-- M2 — contract phase: `listings.host_id` becomes required.
--
-- PRECONDITION, verified before running: zero rows with a NULL hostId. B1
-- (`pnpm backfill:admin-host`) assigns the entire legacy catalogue to the
-- admin's host account, and every create path since M1 sets an owner.
--
-- This is the "contract" half of expand → backfill → contract, and it is
-- deliberately a SEPARATE migration from M1, at least one release later: the
-- application must already be writing the column on every path before the
-- database starts insisting on it, or a single missed write path turns into a
-- hard insert failure in production.
--
-- Guard rather than assume — a NULL here would otherwise surface as a bare
-- Postgres error mid-migration with no indication of what to fix.
DO $$
DECLARE
  orphans bigint;
BEGIN
  SELECT count(*) INTO orphans FROM "listings" WHERE "hostId" IS NULL;
  IF orphans > 0 THEN
    RAISE EXCEPTION
      'Cannot contract listings.hostId: % listing(s) still have no host. Run `pnpm backfill:admin-host` first.',
      orphans;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "listings" ALTER COLUMN "hostId" SET NOT NULL;
