import { AdminLocaleSwitcher } from '@/components/admin/admin-locale-switcher';
import { AdminLogoutButton } from '@/components/admin/admin-logout-button';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default async function AdminAuthedLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('admin');
  return (
    <>
      <header className="border-border bg-background sticky top-0 z-30 border-b">
        <div className="container-wide flex h-14 items-center justify-between gap-3">
          <Link
            href="/admin/listings"
            className="text-primary flex items-center gap-2 text-sm font-semibold tracking-wide uppercase"
          >
            <Image src="/logo.svg" alt="" aria-hidden width={28} height={28} priority />
            {t('appName')}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/listings" className="text-foreground-muted hover:text-foreground">
              {t('nav.listings')}
            </Link>
            <Link href="/admin/regions" className="text-foreground-muted hover:text-foreground">
              {t('nav.regions')}
            </Link>
            <Link href="/admin/amenities" className="text-foreground-muted hover:text-foreground">
              {t('nav.amenities')}
            </Link>
            <Link href="/admin/logs" className="text-foreground-muted hover:text-foreground">
              {t('nav.logs')}
            </Link>
            <Link
              href="/admin/listings/new"
              className="text-foreground-muted hover:text-foreground"
            >
              {t('nav.new')}
            </Link>
            <AdminLocaleSwitcher />
            <AdminLogoutButton />
          </nav>
        </div>
      </header>
      <main className="container-wide py-4 sm:py-6">{children}</main>
    </>
  );
}
