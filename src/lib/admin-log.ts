import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Record an admin mutation in the audit trail. Best-effort: failures are
 * logged to stderr but never bubble — a flaky log table must not break the
 * user's create / update / delete flow. Call AFTER the mutation succeeds.
 *
 * Skipped silently when DATABASE_URL is empty so the mock-data dev path
 * doesn't blow up.
 */
export async function recordAdminLog(input: {
  action: string;
  target?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await prisma.adminLog.create({
      data: {
        action: input.action,
        target: input.target ?? null,
        // Prisma's JsonValue input doesn't accept `undefined` under
        // exactOptionalPropertyTypes; omit the key when no metadata was given.
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
    });
  } catch (err) {
    // Single-line JSON so log aggregators can pick it up.
    console.warn(
      JSON.stringify({
        type: 'admin_log_write_failed',
        at: new Date().toISOString(),
        action: input.action,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
