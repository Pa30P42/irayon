import { apiOk, apiServerError } from '@/lib/api/api-response';
import { requireAdmin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/** GET /api/admin/users?q= — user directory for the admin panel. */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';

  try {
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        becameHostAt: true,
        suspendedAt: true,
        createdAt: true,
        _count: { select: { listings: true, bookings: true } },
      },
    });
    return apiOk({ data: users });
  } catch (err) {
    logger.error('GET /api/admin/users failed', { err });
    return apiServerError();
  }
}
