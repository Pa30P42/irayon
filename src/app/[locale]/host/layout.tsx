import { HostNav } from '@/components/host/host-nav';
import { requireUserPage } from '@/lib/auth-page-guards';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  // Private cabinet. Middleware also stamps `x-robots-tag` on these responses.
  robots: { index: false, follow: false },
};

/**
 * NEVER prerender the host cabinet.
 *
 * The parent `[locale]` layout has `generateStaticParams`, so without this Next
 * statically renders this whole subtree at build time — and a build has no
 * session. The pages came out as `● (SSG)`: a per-user surface frozen into a
 * build-time snapshot, served identically to everyone. `force-dynamic` is what
 * makes the session read happen per request.
 */
export const dynamic = 'force-dynamic';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Gates the whole host cabinet at USER level, not host level.
 *
 * `/host/start` — the "become a host" entry point — lives under this layout and
 * must be reachable by someone who isn't a host yet. Requiring `becameHostAt`
 * here would redirect that page to itself forever. Pages that genuinely need
 * the capability call `requireHostPage()` themselves.
 */
export default async function HostLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  await requireUserPage({ locale });

  return (
    <div className="container-wide space-y-6 py-6">
      <HostNav />
      {children}
    </div>
  );
}
