/**
 * Edge-safe signed-cookie session for the admin panel. Tokens are formatted
 * as `<expiresMs>.<base64urlSig>` where the signature is HMAC-SHA-256 over
 * `admin:<expiresMs>` keyed with `ADMIN_SESSION_SECRET`. The cookie itself
 * is HttpOnly + SameSite=Lax + Secure-in-production.
 *
 * No external libraries: Web Crypto works in both Node and the Edge runtime
 * that powers `middleware.ts`.
 */

export const ADMIN_SESSION_COOKIE = 'irayon_admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const encoder = new TextEncoder();

const base64urlEncode = (bytes: ArrayBuffer): string => {
  const arr = new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]!);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64urlDecode = (input: string): Uint8Array | null => {
  try {
    const padded = input
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(input.length + ((4 - (input.length % 4)) % 4), '=');
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
};

const constantTimeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
};

const importKey = async (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);

const getSecret = (): string | null => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  // Require at least 32 chars so a typo'd short value doesn't quietly accept
  // weak signatures.
  if (!secret || secret.length < 32) return null;
  return secret;
};

export type SignedSession = {
  token: string;
  expiresAt: Date;
};

/**
 * Mints a session token whose signature ties the issued expiry. Callers set
 * the `Max-Age` on the cookie to the same window so server + client agree on
 * lifetime, but the embedded expiry is what we actually trust on verify.
 */
export async function signAdminSession(now: number = Date.now()): Promise<SignedSession | null> {
  const secret = getSecret();
  if (!secret) return null;
  const expiresAt = now + SESSION_TTL_MS;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`admin:${expiresAt}`));
  return {
    token: `${expiresAt}.${base64urlEncode(sig)}`,
    expiresAt: new Date(expiresAt),
  };
}

/**
 * Verifies a session token. Returns false for any reason — bad shape, bad
 * signature, expired, or missing secret.
 */
export async function verifyAdminSession(
  token: string | undefined | null,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;

  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const expiresStr = token.slice(0, dot);
  const sigStr = token.slice(dot + 1);

  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  const providedSig = base64urlDecode(sigStr);
  if (!providedSig) return false;

  const key = await importKey(secret);
  const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(`admin:${expiresAt}`));
  return constantTimeEqual(providedSig, new Uint8Array(expectedSig));
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
