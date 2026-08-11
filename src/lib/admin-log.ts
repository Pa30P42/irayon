import { BREAK_GLASS_USER_ID, type AuthUser } from '@/lib/auth-helpers';
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
  /**
   * Who did it. A break-glass session has no user row, so it logs
   * `adminId: null` + `metadata.breakGlass: true` — the FK can't reference a
   * user that doesn't exist, and "an admin did this but we don't know which"
   * is exactly the fact worth recording.
   */
  actor?: Pick<AuthUser, 'id' | 'breakGlass'> | null;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const isBreakGlass = input.actor?.breakGlass === true || input.actor?.id === BREAK_GLASS_USER_ID;
  const adminId = !input.actor || isBreakGlass ? null : input.actor.id;
  const metadata =
    isBreakGlass && input.metadata !== undefined
      ? ({ ...(input.metadata as object), breakGlass: true } as Prisma.InputJsonValue)
      : isBreakGlass
        ? ({ breakGlass: true } as Prisma.InputJsonValue)
        : input.metadata;

  try {
    await prisma.adminLog.create({
      data: {
        action: input.action,
        target: input.target ?? null,
        adminId,
        // Prisma's JsonValue input doesn't accept `undefined` under
        // exactOptionalPropertyTypes; omit the key when no metadata was given.
        ...(metadata !== undefined ? { metadata } : {}),
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
