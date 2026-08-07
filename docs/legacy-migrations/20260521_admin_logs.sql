-- AdminLog table for the admin audit trail. Apply once against production:
--
--   psql "$DIRECT_URL" -f prisma/migrations/20260521_admin_logs.sql
--
-- Or run `pnpm prisma:migrate` which will pick up the schema.prisma change
-- and generate a regular Prisma migration.

CREATE TABLE IF NOT EXISTS "admin_logs" (
  "id"        TEXT PRIMARY KEY,
  "action"    TEXT NOT NULL,
  "target"    TEXT,
  "metadata"  JSONB,
  "adminId"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "admin_logs_action_createdAt_idx"
  ON "admin_logs" ("action", "createdAt");

CREATE INDEX IF NOT EXISTS "admin_logs_target_idx"
  ON "admin_logs" ("target");
