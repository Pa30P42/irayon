import { apiConflict, apiOk, apiServerError } from '@/lib/api/api-response';
import { anonymiseUser } from '@/lib/api/user-admin-service';
import { expiredSessionCookie, requireSameOrigin, requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

/**
 * POST /api/account/delete — the user asks to be forgotten.
 *
 * Implemented as ANONYMISATION, not deletion. `Booking.guestId` and
 * `Message.senderId` are `Restrict`, deliberately: booking history is the
 * support and legal record the platform exists to be able to produce, and a
 * message with no author is a hole in a conversation someone may later need to
 * read. Row deletion is therefore not merely discouraged — it is impossible
 * once anyone has booked.
 *
 * What the user gets is everything deletion would give them in practice: their
 * name, photo, and phone are gone, their email is released so they could sign
 * up again, their OAuth links are removed, their listings come down, and they
 * are signed out everywhere. What remains has nobody's name on it.
 */
export async function POST(request: Request): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const auth = await requireUser({ force: true });
  if (!auth.ok) return auth.response;

  try {
    const result = await anonymiseUser(auth.user.id);
    if (!result.ok) {
      // An admin deleting themselves would strand the platform with no
      // operator; that needs deliberate database access, not a button.
      return apiConflict(result.reason === 'is-admin' ? 'admin_cannot_delete' : 'not_found');
    }

    const response = apiOk({ ok: true });
    // The session is already invalid (sessionVersion was bumped); clear the
    // cookie so the browser doesn't spend a request finding that out.
    response.headers.append('set-cookie', expiredSessionCookie());
    return response;
  } catch (err) {
    logger.error('POST /api/account/delete failed', { err });
    return apiServerError();
  }
}
