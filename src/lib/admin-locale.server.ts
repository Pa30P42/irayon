import 'server-only';
import { cookies } from 'next/headers';
import {
  ADMIN_LOCALE_COOKIE,
  DEFAULT_ADMIN_LOCALE,
  isAdminLocale,
  type AdminLocale,
} from './admin-locale';

export async function getAdminLocale(): Promise<AdminLocale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_LOCALE_COOKIE)?.value;
  return isAdminLocale(value) ? value : DEFAULT_ADMIN_LOCALE;
}

export async function getAdminMessages(locale: AdminLocale) {
  return (await import(`@/i18n/messages/${locale}.json`)).default;
}
