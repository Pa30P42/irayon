export const ADMIN_LOCALES = ['az', 'ru', 'en'] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];
export const DEFAULT_ADMIN_LOCALE: AdminLocale = 'az';
export const ADMIN_LOCALE_COOKIE = 'admin-locale';

export const isAdminLocale = (value: unknown): value is AdminLocale =>
  typeof value === 'string' && (ADMIN_LOCALES as readonly string[]).includes(value);
