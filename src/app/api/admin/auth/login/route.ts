import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signAdminSession,
} from '@/lib/admin-session';
import { isBreakGlassEnabled } from '@/lib/auth-helpers';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

const constantTimeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
};

const json = (status: number, body: unknown): NextResponse => NextResponse.json(body, { status });

const logFailedAuth = (
  request: Request,
  reason: 'bad-credentials' | 'invalid-body' | 'rate-limited' | 'break-glass-disabled',
): void => {
  // Structured single-line JSON so a log aggregator (Vercel logs, Datadog,
  // etc.) can parse and alert on `type === 'admin_auth_failed'` without a
  // grep-the-stream pipeline.
  console.warn(
    JSON.stringify({
      type: 'admin_auth_failed',
      at: new Date().toISOString(),
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? null,
      reason,
    }),
  );
};

export async function POST(request: Request): Promise<Response> {
  // BREAK-GLASS ONLY. Normal admin access is Google sign-in with `role=admin`;
  // this credential path exists solely so an OAuth misconfiguration or outage
  // can't lock the operator out of their own platform. Disarmed by default, and
  // gated here as well as in middleware so narrowing the matcher later can't
  // silently re-expose it.
  if (!isBreakGlassEnabled()) {
    logFailedAuth(request, 'break-glass-disabled');
    return json(404, { error: { message: 'Not found' } });
  }

  const rate = await checkRateLimit('adminLogin', getClientIp(request));
  if (!rate.success) {
    logFailedAuth(request, 'rate-limited');
    return NextResponse.json(
      { error: { message: 'Too many login attempts. Try again shortly.' } },
      { status: 429, headers: rateLimitHeaders(rate) },
    );
  }

  const expectedUser = process.env.ADMIN_LOGIN;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    return json(503, { error: { message: 'Admin auth is not configured on the server' } });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    logFailedAuth(request, 'invalid-body');
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
    logFailedAuth(request, 'invalid-body');
    return json(400, { error: { message: 'Username and password are required' } });
  }

  const userOk = constantTimeEqual(username, expectedUser);
  const passOk = constantTimeEqual(password, expectedPass);
  if (!userOk || !passOk) {
    logFailedAuth(request, 'bad-credentials');
    return json(401, { error: { message: 'Invalid credentials' } });
  }

  const session = await signAdminSession();
  if (!session) {
    return json(503, {
      error: { message: 'ADMIN_SESSION_SECRET must be set (at least 32 characters)' },
    });
  }

  console.warn(
    JSON.stringify({
      type: 'admin_break_glass_login',
      at: new Date().toISOString(),
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? null,
    }),
  );

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
