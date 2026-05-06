'use client';
// Client component: uses next-intl's usePathname for active link state.

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const links = [
  { href: '/', key: 'home' },
  { href: '/listings', key: 'listings' },
] as const;

export function SiteNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-6 text-sm md:flex">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'text-foreground-muted transition-colors hover:text-[var(--color-primary)]',
              active && 'font-medium text-[var(--color-primary)]',
            )}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
