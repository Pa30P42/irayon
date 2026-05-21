'use client';

import { ADMIN_LOCALES, ADMIN_LOCALE_COOKIE, type AdminLocale } from '@/lib/admin-locale';
import { IconLanguage } from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

const LABELS: Record<AdminLocale, string> = {
  az: 'AZ',
  ru: 'RU',
  en: 'EN',
};

export function AdminLocaleSwitcher() {
  const router = useRouter();
  const t = useTranslations('admin.localeSwitcher');
  const current = useLocale() as AdminLocale;
  const [isPending, startTransition] = useTransition();

  const onChange = (next: AdminLocale) => {
    if (next === current) return;
    // Persist for ~1 year. SameSite=Lax so the cookie survives an /admin -> /admin/login redirect.
    document.cookie = `${ADMIN_LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div
      className="border-border inline-flex items-center gap-0.5 rounded-lg border p-0.5"
      role="group"
      aria-label={t('label')}
    >
      <IconLanguage size={14} className="text-foreground-muted mx-1" aria-hidden />
      {ADMIN_LOCALES.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => onChange(loc)}
          disabled={isPending}
          aria-pressed={current === loc}
          className={`rounded-md px-2 py-0.5 text-[11px] font-medium uppercase transition-colors disabled:opacity-50 ${
            current === loc
              ? 'bg-primary text-white'
              : 'text-foreground-muted hover:bg-accent hover:text-foreground'
          }`}
        >
          {LABELS[loc]}
        </button>
      ))}
    </div>
  );
}
