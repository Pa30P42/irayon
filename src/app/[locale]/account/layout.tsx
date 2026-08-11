import { AccountNav } from '@/components/account/account-nav';
import { requireUserPage } from '@/lib/auth-page-guards';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Never prerender: the parent `[locale]` layout has `generateStaticParams`, so
 * without this Next would try to statically render a per-user surface at build
 * time, when there is no session.
 */
export const dynamic = 'force-dynamic';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AccountLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  await requireUserPage({ locale });

  return (
    <div className="container-wide space-y-6 py-6">
      <AccountNav />
      {children}
    </div>
  );
}
