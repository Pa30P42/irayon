import { AdminLocaleSwitcher } from '@/components/admin/admin-locale-switcher';
import { AdminLogoutButton } from '@/components/admin/admin-logout-button';
import { requireAdminPage } from '@/lib/auth-page-guards';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default async function AdminAuthedLayout({ children }: { children: ReactNode }) {
  // Defense in depth. Middleware gates `/admin/*` too, but these server
  // components used to rely on that 100% — and the matcher had a real hole in
  // it until Phase 1.2b. A layout that checks for itself survives the next one.
  const admin = await requireAdminPage();
  const t = await getTranslations('admin');
  return (
    <>
      <header className="border-border bg-background sticky top-0 z-30 border-b">
        <div className="container-wide flex h-14 items-center justify-between gap-3">
          <Link
            href="/admin/listings"
            className="text-primary flex shrink-0 items-center gap-2 text-sm font-semibold tracking-wide uppercase"
          >
            <Image src="/logo.svg" alt="" aria-hidden width={28} height={28} priority />
            <span className="hidden sm:inline">{t('appName')}</span>
          </Link>
          {/* Scrolls sideways on narrow screens instead of pushing the bar wider. */}
          <nav className="flex min-w-0 items-center gap-4 overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href="/admin/listings"
              className="text-foreground-muted hover:text-foreground shrink-0"
            >
              {t('nav.listings')}
            </Link>
            <Link
              href="/admin/moderation"
              className="text-foreground-muted hover:text-foreground shrink-0"
            >
              {t('nav.moderation')}
            </Link>
            <Link
              href="/admin/regions"
              className="text-foreground-muted hover:text-foreground shrink-0"
            >
              {t('nav.regions')}
            </Link>
            <Link
              href="/admin/amenities"
              className="text-foreground-muted hover:text-foreground shrink-0"
            >
              {t('nav.amenities')}
            </Link>
            <Link
              href="/admin/reports"
              className="text-foreground-muted hover:text-foreground shrink-0"
            >
              {t('nav.reports')}
            </Link>
            <Link
              href="/admin/users"
              className="text-foreground-muted hover:text-foreground shrink-0"
            >
              {t('nav.users')}
            </Link>
            <Link
              href="/admin/logs"
              className="text-foreground-muted hover:text-foreground shrink-0"
            >
              {t('nav.logs')}
            </Link>
            <Link
              href="/admin/listings/new"
              className="text-foreground-muted hover:text-foreground shrink-0"
            >
              {t('nav.new')}
            </Link>
            <AdminLocaleSwitcher />
            <AdminLogoutButton breakGlass={admin.breakGlass} />
          </nav>
        </div>
      </header>
      <main className="container-wide py-4 sm:py-6">{children}</main>
    </>
  );
}
