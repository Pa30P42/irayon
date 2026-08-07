/**
 * Thin logging wrapper around `console` for server-side code. Exists so every
 * route handler logs through one seam — when an error tracker (Sentry) is
 * added later, only this module changes.
 *
 * Keep the `[module]`- or `METHOD /path`-prefixed message convention at call
 * sites; pass structured context as the second argument:
 *
 *   logger.error('POST /api/admin/listings failed', { err });
 *
 * The three structured single-line JSON log points (`admin_auth_failed`,
 * `admin_log_write_failed`, `call_click`) intentionally bypass this wrapper —
 * they are machine-parseable event streams, not error reports.
 */
type Context = Record<string, unknown>;

export const logger = {
  error(message: string, context: Context = {}) {
    console.error(message, context);
  },

  warn(message: string, context: Context = {}) {
    console.warn(message, context);
  },
};
