'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const ITEMS = [
  { href: '/host', key: 'dashboard' },
  { href: '/host/bookings', key: 'bookings' },
  { href: '/host/calendar', key: 'calendar' },
  { href: '/host/listings', key: 'listings' },
  { href: '/host/listings/new', key: 'newListing' },
] as const;

export function HostNav() {
  const t = useTranslations('host.nav');
  const pathname = usePathname();

  return (
    <nav className="border-border flex items-center gap-4 overflow-x-auto border-b pb-2 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ITEMS.map((item) => {
        // Exact match for the dashboard, prefix match for the rest — otherwise
        // `/host` would light up on every page in the cabinet.
        const active =
          item.href === '/host' ? pathname === '/host' : pathname.startsWith(item.href);
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
