'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const ITEMS = [
  { href: '/account/bookings', key: 'bookingsTitle' },
  { href: '/account/messages', key: 'messagesTitle' },
  { href: '/account/settings', key: 'settingsTitle' },
] as const;

export function AccountNav() {
  const t = useTranslations('account');
  const pathname = usePathname();

  return (
    <nav className="border-border flex items-center gap-4 overflow-x-auto border-b pb-2 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'shrink-0 whitespace-nowrap',
              active
                ? 'text-foreground font-medium'
                : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
