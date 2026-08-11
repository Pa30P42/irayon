-- M3 — Stage 2: bookings, availability blocks, and notifications.
--
-- Additive. The one thing here that is NOT expressible in the Prisma schema is
-- the exclusion constraint at the bottom, which is the actual guarantee that
-- two guests can't hold the same dates. Prisma's `migrate diff` cannot see it,
-- so it will propose dropping it on every future diff — like the trigram
-- indexes from 20260806000200. Do not let a generated diff remove it.

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled', 'completed');



-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "cleaningFee" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'pending',
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "guestNote" TEXT,
    "pricePerNight" INTEGER NOT NULL,
    "cleaningFee" INTEGER NOT NULL,
    "nights" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_blocks" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_listingId_status_checkIn_idx" ON "bookings"("listingId", "status", "checkIn");

-- CreateIndex
CREATE INDEX "bookings_guestId_createdAt_idx" ON "bookings"("guestId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "bookings_status_expiresAt_idx" ON "bookings"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "bookings_status_checkOut_idx" ON "bookings"("status", "checkOut");

-- CreateIndex
CREATE INDEX "availability_blocks_listingId_startDate_idx" ON "availability_blocks"("listingId", "startDate");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Concurrency invariant
-- ---------------------------------------------------------------------------
--
-- The single most important correctness property in the system: two guests
-- must never both hold the same dates on the same listing.
--
-- The application checks for overlaps inside a transaction that takes
-- `SELECT ... FOR UPDATE` on the listing row, but a pre-check is a pre-check —
-- it narrows the window, it does not close it. This constraint closes it, in
-- the database, where no application bug can route around it. A conflicting
-- INSERT/UPDATE raises SQLSTATE 23P01, which the accept handler catches and
-- turns into a 409.
--
-- `WHERE (status = 'accepted')` is what makes request-to-book work at all:
-- any number of PENDING requests may overlap (that is the entire point of
-- guests competing for dates), and only an acceptance takes the dates.
--
-- The range is half-open `[checkIn, checkOut)`, so one guest checking out on
-- the morning another checks in is not an overlap — by construction, rather
-- than by a special case somebody has to remember.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_accepted_overlap"
  EXCLUDE USING gist (
    "listingId" WITH =,
    daterange("checkIn", "checkOut", '[)') WITH &&
  )
  WHERE ("status" = 'accepted'::"booking_status");

-- Sanity constraints. A zero- or negative-length stay is meaningless, and
-- `daterange` would throw on an inverted range anyway — better a named CHECK
-- than a raw range error from deep inside the exclusion constraint.
--
-- Added plain rather than NOT VALID + VALIDATE: both tables are created empty
-- in this same migration, so there is nothing to scan.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_valid_range" CHECK ("checkOut" > "checkIn");

ALTER TABLE "availability_blocks"
  ADD CONSTRAINT "blocks_valid_range" CHECK ("endDate" > "startDate");
