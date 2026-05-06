import { timingSafeEqual } from 'node:crypto';

/**
 * Minimal HTTP Basic Auth check for admin-only API routes. Reads
 * ADMIN_LOGIN/ADMIN_PASSWORD from the env. The 401 response includes a
 * `WWW-Authenticate: Basic` header so curl/browsers prompt for credentials.
 *
 * Replace this with a real session/JWT auth layer once we have one.
 */

const constantTimeEqual = (a: string, b: string): boolean => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
};

const decodeBasic = (header: string | null): { user: string; pass: string } | null => {
  if (!header || !header.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx < 0) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
};

export type AdminAuthResult = { ok: true } | { ok: false; response: Response };

const unauthorized = (message: string): Response =>
  new Response(JSON.stringify({ error: { message } }), {
    status: 401,
    headers: {
      'content-type': 'application/json',
      'www-authenticate': 'Basic realm="irayon-admin", charset="UTF-8"',
    },
  });

export function requireAdmin(request: Request): AdminAuthResult {
  const expectedUser = process.env.ADMIN_LOGIN;
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPass) {
    // Fail closed: no credentials configured == no admin access.
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: { message: 'Admin auth is not configured on the server' } }),
        { status: 503, headers: { 'content-type': 'application/json' } },
      ),
    };
  }

  const provided = decodeBasic(request.headers.get('authorization'));
  if (!provided) return { ok: false, response: unauthorized('Authentication required') };

  const userOk = constantTimeEqual(provided.user, expectedUser);
  const passOk = constantTimeEqual(provided.pass, expectedPass);
  if (!userOk || !passOk) return { ok: false, response: unauthorized('Invalid credentials') };

  return { ok: true };
}
