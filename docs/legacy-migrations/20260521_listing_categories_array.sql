-- One-off migration: migrate Listing.category (single enum) → categories (enum[]).
--
-- Run once against the production DB BEFORE the next `prisma db push`/`generate`
-- ships, e.g.:
--
--   psql "$DIRECT_URL" -f prisma/migrations/20260521_listing_categories_array.sql
--
-- Steps:
--   1. Add the new array column with an empty default so the ALTER doesn't fail
--      on existing rows.
--   2. Backfill: wrap the current scalar value into a single-element array.
--   3. Drop the legacy column + index; add a GIN index on the new array column
--      so `?` / `&&` / `@>` membership tests stay indexed.
--   4. Remove the temporary default — Prisma's array fields don't carry one.

BEGIN;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS categories listing_category[] NOT NULL
  DEFAULT ARRAY[]::listing_category[];

UPDATE listings
SET categories = ARRAY[category]
WHERE cardinality(categories) = 0 AND category IS NOT NULL;

DROP INDEX IF EXISTS "listings_category_idx";

ALTER TABLE listings DROP COLUMN IF EXISTS category;

CREATE INDEX IF NOT EXISTS "listings_categories_idx" ON listings USING GIN (categories);

ALTER TABLE listings ALTER COLUMN categories DROP DEFAULT;

COMMIT;
