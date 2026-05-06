'use client';

import { useLocale as useIntlLocale } from 'next-intl';
import { localeToBcp47 } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

type UseLocaleResult = {
  locale: Locale;
  bcp47: string;
  isRtl: boolean;
};

export function useLocale(): UseLocaleResult {
  const locale = useIntlLocale() as Locale;
  return {
    locale,
    bcp47: localeToBcp47(locale),
    isRtl: false,
  };
}
