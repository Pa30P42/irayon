import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * `DATABASE_URL` carries runtime-shaped pool settings
 * (`connection_limit=5&pool_timeout=10`): right for serverless, where every
 * warm lambda holds its own pool and dozens of them share one Postgres.
 *
 * A production build is the opposite shape — worker processes prerendering
 * every static page concurrently. Five connections with a 10s wait starves
 * there, and a random page dies with P2024 ("Timed out fetching a new
 * connection"), failing the deploy nondeterministically.
 *
 * The fix is patience, NOT more sockets: `next build` runs several workers and
 * each constructs its own client, so raising `connection_limit` multiplies
 * across workers and overruns Supabase's pooler ("Can't reach database
 * server"). Keep the limit as configured and only let queued queries wait.
 */
const BUILD_POOL = { pool_timeout: '60' } as const;

function buildTimeDatabaseUrl(): string | null {
  if (process.env.NEXT_PHASE !== 'phase-production-build') return null;
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    for (const [key, value] of Object.entries(BUILD_POOL)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    // Malformed URL — let Prisma surface its own error rather than masking it.
    return null;
  }
}

const buildUrl = buildTimeDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(buildUrl ? { datasources: { db: { url: buildUrl } } } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
