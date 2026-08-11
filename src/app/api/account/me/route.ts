import { auth } from '@/auth';
import { apiOk } from '@/lib/api/api-response';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/account/me
 *
 * The header's view of "who am I". Deliberately NOT a `requireUser()` strict
 * check: this endpoint must never sign anyone out or 401 — it answers
 * `{ user: null }` for anonymous visitors, which is a completely normal state
 * on a public marketplace. The gates that guard real actions do the strict
 * checking.
 *
 * `private, no-store` is stamped centrally in `src/middleware.ts` for
 * `/api/account/*`, so this response can never be shared by a CDN.
 */
export async function GET(): Promise<Response> {
  try {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return apiOk({ user: null });

    const row = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        becameHostAt: true,
        suspendedAt: true,
      },
    });
    if (!row || row.suspendedAt) return apiOk({ user: null });

    return apiOk({
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        image: row.image,
        role: row.role === 'ADMIN' ? 'admin' : 'user',
        isHost: row.becameHostAt !== null,
      },
    });
  } catch (err) {
    // A header that can't resolve the session renders as signed out. Failing
    // this request loudly would put an error state in the chrome of every page.
    logger.error('GET /api/account/me failed', { err });
    return apiOk({ user: null });
  }
}
