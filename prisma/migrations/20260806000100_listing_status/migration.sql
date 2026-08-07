-- CreateEnum
CREATE TYPE "listing_status" AS ENUM ('draft', 'published', 'archived');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "status" "listing_status" NOT NULL DEFAULT 'published';

