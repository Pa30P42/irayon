-- Baseline migration generated 2026-08-06 from prisma/schema.prisma via
--   prisma migrate diff --from-empty --to-schema-datamodel --script
-- The live DB was built with `prisma db push` + two hand-run SQL files (now
-- in docs/legacy-migrations/) whose effects are already part of this schema.
-- Mark as applied on the live DB (do NOT execute it there):
--   pnpm dotenv -e .env.local -- prisma migrate resolve --applied 0_init

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "listing_category" AS ENUM ('mountain', 'forest', 'river', 'sea', 'lake');

-- CreateEnum
CREATE TYPE "place_type" AS ENUM ('a-frame', 'villa-cottage', 'hotel', 'modular', 'village-room');

-- CreateEnum
CREATE TYPE "meal" AS ENUM ('breakfast', 'on-request');

-- CreateEnum
CREATE TYPE "activity" AS ENUM ('quad', 'horse', 'fishing');

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "coverImage" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "villages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "regionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "villages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "regionId" TEXT NOT NULL,
    "villageId" TEXT,
    "placeType" "place_type" NOT NULL,
    "categories" "listing_category"[],
    "price" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "meals" "meal"[],
    "activities" "activity"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_amenities" (
    "listingId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,

    CONSTRAINT "listing_amenities_pkey" PRIMARY KEY ("listingId","amenityId")
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "metadata" JSONB,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_slug_key" ON "regions"("slug");

-- CreateIndex
CREATE INDEX "villages_regionId_idx" ON "villages"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "villages_regionId_slug_key" ON "villages"("regionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_slug_key" ON "amenities"("slug");

-- CreateIndex
CREATE INDEX "amenities_category_idx" ON "amenities"("category");

-- CreateIndex
CREATE UNIQUE INDEX "listings_slug_key" ON "listings"("slug");

-- CreateIndex
CREATE INDEX "listings_categories_idx" ON "listings" USING GIN ("categories");

-- CreateIndex
CREATE INDEX "listings_regionId_idx" ON "listings"("regionId");

-- CreateIndex
CREATE INDEX "listings_villageId_idx" ON "listings"("villageId");

-- CreateIndex
CREATE INDEX "listings_placeType_idx" ON "listings"("placeType");

-- CreateIndex
CREATE INDEX "listings_price_idx" ON "listings"("price");

-- CreateIndex
CREATE INDEX "listings_rating_idx" ON "listings"("rating");

-- CreateIndex
CREATE INDEX "listings_createdAt_idx" ON "listings"("createdAt");

-- CreateIndex
CREATE INDEX "listing_amenities_amenityId_idx" ON "listing_amenities"("amenityId");

-- CreateIndex
CREATE INDEX "images_listingId_order_idx" ON "images"("listingId", "order");

-- CreateIndex
CREATE INDEX "admin_logs_action_createdAt_idx" ON "admin_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "admin_logs_target_idx" ON "admin_logs"("target");

-- AddForeignKey
ALTER TABLE "villages" ADD CONSTRAINT "villages_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "villages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_amenities" ADD CONSTRAINT "listing_amenities_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_amenities" ADD CONSTRAINT "listing_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

