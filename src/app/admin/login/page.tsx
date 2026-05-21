import { AdminLoginForm } from '@/components/admin/admin-login-form';
import { Eyebrow, Heading } from '@/components/ui/typography';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

type PageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

/**
 * Accept only same-origin, non-protocol-relative paths. `'/foo'` is fine;
 * `'//evil.com'` and `'/\\evil.com'` are browser-protocol-relative tricks that
 * `router.push` may resolve to an external host.
 */
const isSafeNext = (value: string): boolean =>
  value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\');

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = typeof params.next === 'string' && isSafeNext(params.next) ? params.next : null;
  const t = await getTranslations('admin.login');

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="border-border bg-background w-full max-w-sm space-y-6 rounded-2xl border p-6 shadow-sm sm:p-8">
        <header className="flex flex-col items-center space-y-2 text-center">
          <Image src="/logo.svg" alt="iRayon" width={56} height={56} priority />
          <Eyebrow className="text-primary text-xs">{t('eyebrow')}</Eyebrow>
          <Heading as="h1" level="compact">
            {t('title')}
          </Heading>
          <p className="text-foreground-muted text-sm">{t('subtitle')}</p>
        </header>
        <AdminLoginForm next={next} />
      </div>
    </div>
  );
}
