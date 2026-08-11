import { HostListingFormClient } from '@/components/host/host-listing-form-client';
import { Heading } from '@/components/ui/typography';
import { requireUserPage } from '@/lib/auth-page-guards';
import { canBecomeHost } from '@/lib/host-signup';
import type { Route } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

type PageProps = { params: Promise<{ locale: string }> };

/**
 * Deliberately `requireUserPage`, not `requireHostPage`: this page is where a
 * user BECOMES a host (`becameHostAt` is stamped by the create endpoint), so
 * requiring the capability first would make it unreachable.
 */
export default async function NewHostListingPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await requireUserPage({ locale });

  // Cosmetic gate, mirroring the server-side 403 in POST /api/host/listings.
  if (!user.becameHostAt && !canBecomeHost(user.email)) {
    redirect(`/${locale}/host/start` as Route);
  }

  const t = await getTranslations({ locale, namespace: 'host.listings' });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <Heading as="h1" level="page">
          {t('newTitle')}
        </Heading>
        <p className="text-foreground-muted text-sm">{t('newDescription')}</p>
      </header>
      <HostListingFormClient action="create" />
    </div>
  );
}
