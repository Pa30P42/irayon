/**
 * The placeholder owner for platform-curated listings.
 *
 * `listings.hostId` is NOT NULL from M2 onward, so the seed needs *some* user
 * to own the curated catalogue — but it must not be the real operator.
 *
 * **Why not just seed a row with `ADMIN_EMAIL`?** Because that row would have
 * no linked `accounts` entry, and we deliberately don't enable
 * `allowDangerousEmailAccountLinking`. The first time the operator signed in
 * with Google, Auth.js would find an existing user with that email and no
 * matching account, and refuse with `OAuthAccountNotLinked` — locking them out
 * of their own platform on their very first sign-in.
 *
 * `.invalid` is reserved by RFC 2606: the TLD can never be registered, so no
 * Google account can ever exist for this address and it can never be signed
 * into. `pnpm backfill:admin-host` reassigns everything this account owns to
 * the real admin and then removes it.
 */
export const PLATFORM_HOST_EMAIL = 'catalogue@irayon.invalid';

export const PLATFORM_HOST_NAME = 'irayon (platform catalogue)';
