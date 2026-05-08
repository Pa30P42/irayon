import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { QueryProvider } from '@/components/providers/query-provider';
import { SkipLink } from '@/components/shared/skip-link';
import { routing, type Locale } from '@/i18n/routing';
import { SITE } from '@/lib/constants';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';
import '../globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.name,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
};

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <body className="bg-surface flex min-h-screen flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <NuqsAdapter>
              <SkipLink />
              <SiteHeader />
              <main id="main" className="flex-1">
                {children}
              </main>
              <SiteFooter />
            </NuqsAdapter>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
