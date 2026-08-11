import { handlers } from '@/auth';

/**
 * Auth.js route handlers (sign-in, callback, sign-out, CSRF, session).
 *
 * Auth.js protects its own endpoints against CSRF; every *other* user-initiated
 * mutation in the app adds `requireSameOrigin()` explicitly.
 */
export const { GET, POST } = handlers;
