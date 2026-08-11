import { AccountSettingsForm } from '@/components/account/account-settings-form';
import { Heading } from '@/components/ui/typography';
import { requireUserPage } from '@/lib/auth-page-guards';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';

type PageProps = { params: Promise<{ locale: string }> };

export default async function AccountSettingsPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await requireUserPage({ locale });
  const [t, profile] = await Promise.all([
    getTranslations({ locale, namespace: 'account' }),
    // `phone` isn't on the session strict-check select — that runs on every
    // gated request and has no business carrying a field only this page needs.
    prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } }),
  ]);

  return (
    <div className="max-w-lg space-y-5">
      <Heading as="h1" level="page">
        {t('settingsTitle')}
      </Heading>
      <AccountSettingsForm
        initial={{
          name: user.name ?? '',
          email: user.email,
          phone: profile?.phone ?? '',
          preferredLocale: user.preferredLocale,
        }}
      />
    </div>
  );
}
