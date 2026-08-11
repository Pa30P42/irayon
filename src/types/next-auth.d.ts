import type { UserRole } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

/**
 * Session/JWT shape.
 *
 * The token carries exactly three claims beyond the defaults: `sub` (user id),
 * `role`, and `sv` (session version). Middleware trusts them optimistically —
 * it only needs to decide "let this request reach the server at all". Every
 * server-side gate re-checks `role`/`sv`/`suspendedAt` against the database via
 * `requireUser()`, so a stale token can never outlive a revocation.
 *
 * Keep this token small: it rides on every request as a cookie.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Lowercase<UserRole>;
      sessionVersion: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Lowercase<UserRole>;
    /** Session version — bumped on revoke/suspend to invalidate this token. */
    sv?: number;
  }
}
