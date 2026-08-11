import { auth } from '@/auth';
import { SignInForm } from '@/components/auth/signin-form';
import { routing, type Locale } from '@/i18n/routing';
import type { Metadata, Route } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; reason?: string; error?: string }>;
};

export const metadata: Metadata = {
  // Never index a sign-in page.
  robots: { index: false, follow: false },
};

/**
 * This page reads the session to bounce an already-signed-in visitor. Under the
 * `[locale]` layout's `generateStaticParams` that read would otherwise be
 * resolved once at build time and baked into a static page.
 */
export const dynamic = 'force-dynamic';

/**
 * Only same-origin relative paths are accepted as a post-sign-in destination.
 * An open redirect on a sign-in page is a phishing primitive: the victim
 * genuinely authenticates on our domain and is then handed to the attacker's.
 */
function safeNext(raw: string | undefined, locale: string): string {
  if (!raw) return `/${locale}`;
  if (!raw.startsWith('/') || raw.startsWith('//')) return `/${locale}`;
  return raw;
}

export default async function SignInPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { next, reason, error } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'auth' });

  const resolvedLocale = (routing.locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : routing.defaultLocale;
  const callbackUrl = safeNext(next, resolvedLocale);

  // Already signed in — nothing to do here.
  const session = await auth();
  // `callbackUrl` is validated by `safeNext` above; the cast only tells
  // `typedRoutes` that a runtime-computed string is intended here.
  if (session?.user?.id) redirect(callbackUrl as Route);

  const googleEnabled = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
  const devLoginEnabled =
    process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_LOGIN === 'true';

  // `reason` comes from our own gates; `error` from Auth.js. Both are looked up
  // in the message catalogue, so an unknown value renders nothing rather than
  // reflecting attacker-supplied text onto the page.
  const noticeKey = reason ?? error;
  const notice = noticeKey && t.has(`reason.${noticeKey}`) ? t(`reason.${noticeKey}`) : null;

  return (
    <main className="container-wide flex min-h-[60vh] items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-foreground-muted text-sm">{t('subtitle')}</p>
        </div>

        {notice ? (
          <p role="status" className="border-border bg-accent rounded-md border p-3 text-sm">
            {notice}
          </p>
        ) : null}

        <SignInForm
          googleEnabled={googleEnabled}
          devLoginEnabled={devLoginEnabled}
          callbackUrl={callbackUrl}
        />
      </div>
    </main>
  );
}
