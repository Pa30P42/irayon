'use client';
// Client component: uses next-intl's usePathname for active link state.

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', key: 'home' },
  { href: '/listings', key: 'listings' },
] as const;

export function SiteNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-6 text-sm">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'text-foreground-muted hover:text-[var(--color-primary)] transition-colors',
              active && 'text-[var(--color-primary)] font-medium',
            )}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
