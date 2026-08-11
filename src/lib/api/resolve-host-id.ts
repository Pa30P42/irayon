import type { AuthUser } from '@/lib/auth-helpers';
import { PLATFORM_HOST_EMAIL } from '@/lib/platform-host';
import { prisma } from '@/lib/prisma';

/**
 * Which user owns a listing an ADMIN creates.
 *
 * `listings.hostId` is NOT NULL from M2, so every create path must name an
 * owner — and the obvious answer ("the acting admin") has a hole in it: a
 * break-glass session has no user row at all, so writing its sentinel id would
 * violate the foreign key and fail the create with a raw Postgres error.
 *
 * Order of preference:
 *   1. the acting admin, when they are a real signed-in user;
 *   2. the `ADMIN_EMAIL` account, for a break-glass session;
 *   3. the reserved platform catalogue account, which the seed guarantees.
 *
 * Returns `null` only when none of the three exists, which the caller reports
 * as a configuration problem rather than a 500.
 */
export async function resolveAdminHostId(actor: AuthUser): Promise<string | null> {
  if (!actor.breakGlass) return actor.id;

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    const admin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true },
    });
    if (admin) return admin.id;
  }

  const platform = await prisma.user.findUnique({
    where: { email: PLATFORM_HOST_EMAIL },
    select: { id: true },
  });
  return platform?.id ?? null;
}
