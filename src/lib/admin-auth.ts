import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/admin-session';

/**
 * Per-route auth helper used inside `/api/admin/*` handlers as defense in
 * depth — the global middleware also gates these paths, but importing this
 * means a route stays safe even if someone narrows the matcher later.
 */

export type AdminAuthResult = { ok: true } | { ok: false; response: Response };

const unauthorized = (message: string): Response =>
  new Response(JSON.stringify({ error: { message } }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });

const readSessionCookie = (request: Request): string | null => {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === ADMIN_SESSION_COOKIE) return rest.join('=');
  }
  return null;
};

export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
  if (!process.env.ADMIN_LOGIN || !process.env.ADMIN_PASSWORD) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: { message: 'Admin auth is not configured on the server' } }),
        { status: 503, headers: { 'content-type': 'application/json' } },
      ),
    };
  }
  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 32) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: { message: 'ADMIN_SESSION_SECRET must be set (at least 32 characters)' },
        }),
        { status: 503, headers: { 'content-type': 'application/json' } },
      ),
    };
  }

  const token = readSessionCookie(request);
  const valid = await verifyAdminSession(token);
  if (!valid) return { ok: false, response: unauthorized('Authentication required') };

  return { ok: true };
}
