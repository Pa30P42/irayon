import { apiBadRequest, apiBadRequestRaw, apiOk, apiServerError } from '@/lib/api/api-response';
import { requireSameOrigin, requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * Editable profile fields.
 *
 * `email` is absent on purpose: it is the identity Google authenticated, and the
 * key both the suspension check and the admin backfill look up by. Letting a
 * user rewrite it here would let them walk out from under a suspension, and
 * would desynchronise the row from its linked OAuth account.
 */
const settingsSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{6,20}$/, 'Phone must be 6-20 digits')
      .or(z.literal(''))
      .optional(),
    preferredLocale: z.enum(['az', 'ru', 'en']),
  })
  .strict();

export async function PATCH(request: Request): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireUser({ force: true });
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiBadRequestRaw('Invalid JSON body');
  }
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return apiBadRequest(parsed.error);

  try {
    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone ? parsed.data.phone : null,
        // Drives the language of every email this user receives from now on.
        preferredLocale: parsed.data.preferredLocale,
      },
      select: { name: true, phone: true, preferredLocale: true },
    });
    return apiOk(updated);
  } catch (err) {
    logger.error('PATCH /api/account/settings failed', { err });
    return apiServerError();
  }
}
