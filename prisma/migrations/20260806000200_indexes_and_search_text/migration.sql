-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "search_text" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "villages_slug_idx" ON "villages"("slug");

-- CreateIndex
CREATE INDEX "listings_status_createdAt_idx" ON "listings"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "listings_regionId_createdAt_idx" ON "listings"("regionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "listings_placeType_createdAt_idx" ON "listings"("placeType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "listings_capacity_idx" ON "listings"("capacity");

-- CreateIndex
CREATE INDEX "listings_meals_idx" ON "listings" USING GIN ("meals");

-- CreateIndex
CREATE INDEX "listings_activities_idx" ON "listings" USING GIN ("activities");


-- ---------------------------------------------------------------------------
-- Raw SQL beyond Prisma's schema DSL (documented drift):
-- ---------------------------------------------------------------------------

-- Trigram matching for the `q` substring search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Backfill search_text for existing rows: all three title locales + address,
-- lowercased. The service write paths keep it current from here on
-- (`buildListingSearchText` in src/lib/api/listing-search-text.ts).
UPDATE "listings"
SET "search_text" = lower(
  coalesce("title"->>'az', '') || ' ' ||
  coalesce("title"->>'ru', '') || ' ' ||
  coalesce("title"->>'en', '') || ' ' ||
  coalesce("address", '')
);

-- `search_text ILIKE '%q%'` uses this instead of a sequential scan.
CREATE INDEX IF NOT EXISTS "listings_search_text_trgm_idx"
  ON "listings" USING GIN ("search_text" gin_trgm_ops);

-- The admin create path resolves slug uniqueness with a `startsWith` scan
-- (`slug LIKE 'base%'`), which the unique btree can't serve under a non-C
-- collation. text_pattern_ops makes the prefix scan indexed.
CREATE INDEX IF NOT EXISTS "listings_slug_prefix_idx"
  ON "listings" ("slug" text_pattern_ops);
