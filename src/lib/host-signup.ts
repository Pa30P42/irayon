/**
 * Who may become a host.
 *
 * ACCOUNT-SCOPED, not a plain boolean. A boolean defaulting to "off" is
 * circular: the Stage 1 production smoke test *begins* with "become a host",
 * so with public signup closed there would be no way to exercise the flow
 * against real infrastructure at all — and the first time it ran would be the
 * day it was opened to strangers.
 *
 * The allowlist lets the full path be verified in production while public
 * signup stays shut. Opening it later is then one env change on a code path
 * that has already been exercised end to end.
 */

const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

/** The operator can always host — they own every backfilled legacy listing. */
export function hostSignupAllowlist(): string[] {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const list = splitList(process.env.HOST_SIGNUP_ALLOWLIST);
  return admin && !list.includes(admin) ? [...list, admin] : list;
}

export const isHostSignupOpen = (): boolean => process.env.HOST_SIGNUP_ENABLED === 'true';

/**
 * `true` when this account may create its first listing. Checked on the server
 * in `POST /api/host/listings`; the UI hides the CTA using the same answer, but
 * the hidden CTA is cosmetic — the 403 is the gate.
 */
export function canBecomeHost(email: string | null | undefined): boolean {
  if (isHostSignupOpen()) return true;
  if (!email) return false;
  return hostSignupAllowlist().includes(email.trim().toLowerCase());
}
