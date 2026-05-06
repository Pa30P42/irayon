#!/usr/bin/env bash
# Forwards args to `prisma`, but with DATABASE_URL pinned to DIRECT_URL.
# Used for migrate/seed/push/studio — operations that don't work through
# Supabase's pgbouncer pooler (port 6543) and need the direct connection.
set -euo pipefail

if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "DIRECT_URL is not set. Did dotenv-cli load .env.local?" >&2
  exit 1
fi

DATABASE_URL="$DIRECT_URL" exec pnpm exec prisma "$@"
