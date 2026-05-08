import { ADMIN_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signAdminSession } from '@/lib/admin-session';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const constantTimeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
};

const json = (status: number, body: unknown): NextResponse =>
  NextResponse.json(body, { status });

export async function POST(request: Request): Promise<Response> {
  const expectedUser = process.env.ADMIN_LOGIN;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    return json(503, { error: { message: 'Admin auth is not configured on the server' } });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(400, { error: { message: 'Invalid JSON body' } });
  }

  const username =
    typeof (raw as { username?: unknown })?.username === 'string'
      ? (raw as { username: string }).username
      : null;
  const password =
    typeof (raw as { password?: unknown })?.password === 'string'
      ? (raw as { password: string }).password
      : null;
  if (!username || !password) {
    return json(400, { error: { message: 'Username and password are required' } });
  }

  const userOk = constantTimeEqual(username, expectedUser);
  const passOk = constantTimeEqual(password, expectedPass);
  if (!userOk || !passOk) {
    return json(401, { error: { message: 'Invalid credentials' } });
  }

  const session = await signAdminSession();
  if (!session) {
    return json(503, {
      error: { message: 'ADMIN_SESSION_SECRET must be set (at least 32 characters)' },
    });
  }

  const response = json(200, { ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: session.token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
