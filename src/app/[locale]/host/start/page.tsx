import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/typography';
import { Link } from '@/i18n/navigation';
import { requireUserPage } from '@/lib/auth-page-guards';
import { canBecomeHost } from '@/lib/host-signup';
import type { Route } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

type PageProps = { params: Promise<{ locale: string }> };

/**
 * "Become a host" entry point.
 *
 * The CTA is hidden when the account isn't allowed to host — but that is
 * cosmetic. `POST /api/host/listings` refuses independently; hiding a button
 * has never stopped anyone who can open a network tab.
 */
export default async function HostStartPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await requireUserPage({ locale });

  // Already a host — this page has nothing to offer.
  if (user.becameHostAt) redirect(`/${locale}/host` as Route);

  const t = await getTranslations({ locale, namespace: 'host.start' });
  const allowed = canBecomeHost(user.email);

  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <header className="space-y-2">
        <Heading as="h1" level="page">
          {t('title')}
        </Heading>
        <p className="text-foreground-muted text-sm">{t('subtitle')}</p>
      </header>

      <ol className="space-y-3">
        {[t('step1'), t('step2'), t('step3')].map((step, index) => (
          <li key={step} className="flex items-start gap-3">
            <span className="bg-accent text-primary grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold">
              {index + 1}
            </span>
            <span className="text-sm">{step}</span>
          </li>
        ))}
      </ol>

      {allowed ? (
        <Button asChild size="lg">
          <Link href="/host/listings/new">{t('cta')}</Link>
        </Button>
      ) : (
        <div className="border-border rounded-xl border border-dashed p-4">
          <p className="text-sm font-medium">{t('closedTitle')}</p>
          <p className="text-foreground-muted mt-1 text-sm">{t('closedBody')}</p>
        </div>
      )}
    </div>
  );
}
