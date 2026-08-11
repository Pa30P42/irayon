-- M1 — Marketplace stage 1, additive only (expand phase).
--
-- Adds the User/Account/Session tables (Auth.js Prisma adapter), the listing
-- ownership + moderation columns, per-image moderation state, and the real
-- admin_logs.adminId FK. Nothing is dropped and nothing becomes NOT NULL here:
-- `listings.hostId` stays nullable until B1 (backfill) has been verified in
-- production, and is contracted in M2.
--
-- NOTE: the trigram/prefix indexes created in raw SQL by migration
-- 20260806000200 (`listings_search_text_trgm_idx`, `listings_slug_prefix_idx`)
-- are invisible to `prisma migrate diff` and it proposes dropping them on every
-- diff. They are deliberately kept — do not let a generated diff remove them.

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "moderation_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "image_moderation_state" AS ENUM ('live', 'pending-add', 'pending-remove');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'user',
    "preferredLocale" TEXT NOT NULL DEFAULT 'az',
    "phone" TEXT,
    "becameHostAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- AlterTable — per-image moderation state. `live` is correct for every row
-- that exists today (all of them belong to the admin's approved catalogue).
ALTER TABLE "images" ADD COLUMN     "moderationState" "image_moderation_state" NOT NULL DEFAULT 'live';

-- AlterTable — ownership + moderation columns.
--
-- `moderationStatus` is added with DEFAULT 'approved' so every existing row
-- keeps its current public visibility without a separate UPDATE pass. The
-- default is flipped to 'pending' as the LAST statement of this migration, so
-- from here on an omission in any create path produces an invisible listing
-- rather than an unmoderated public one.
ALTER TABLE "listings" ADD COLUMN     "hostId" TEXT,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT,
ADD COLUMN     "moderationNote" TEXT,
ADD COLUMN     "moderationStatus" "moderation_status" NOT NULL DEFAULT 'approved',
ADD COLUMN     "pendingChanges" JSONB;

-- CreateIndex
CREATE INDEX "admin_logs_adminId_createdAt_idx" ON "admin_logs"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "listings_hostId_createdAt_idx" ON "listings"("hostId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "listings_moderationStatus_createdAt_idx" ON "listings"("moderationStatus", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "listings_status_moderationStatus_createdAt_idx" ON "listings"("status", "moderationStatus", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Fail-closed default flip. MUST stay the last statement of this migration:
-- existing rows were backfilled 'approved' by the ADD COLUMN default above,
-- and everything created from now on defaults to 'pending'. Prisma declares
-- @default(PENDING) so schema and database agree from M1 onward.
ALTER TABLE "listings" ALTER COLUMN "moderationStatus" SET DEFAULT 'pending';
