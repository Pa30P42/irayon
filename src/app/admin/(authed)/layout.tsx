import { AdminLogoutButton } from '@/components/admin/admin-logout-button';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AdminAuthedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-border bg-background sticky top-0 z-30 border-b">
        <div className="container-wide flex h-14 items-center justify-between gap-3">
          <Link
            href="/admin/listings"
            className="text-primary text-sm font-semibold tracking-wide uppercase"
          >
            IRayon · Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/listings" className="text-foreground-muted hover:text-foreground">
              Listings
            </Link>
            <Link
              href="/admin/listings/new"
              className="text-foreground-muted hover:text-foreground"
            >
              New
            </Link>
            <AdminLogoutButton />
          </nav>
        </div>
      </header>
      <main className="container-wide py-4 sm:py-6">{children}</main>
    </>
  );
}
