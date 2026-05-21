import { QueryProvider } from '@/components/providers/query-provider';
import { getAdminLocale, getAdminMessages } from '@/lib/admin-locale.server';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import '../globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'iRayon Admin',
  robots: { index: false, follow: false },
};

/**
 * Root /admin layout — only renders the html/body shell so the login page
 * (which lives outside the `(authed)` group) doesn't inherit the admin
 * header. The nested `(authed)/layout.tsx` adds the header + nav.
 *
 * Locale is cookie-driven (separate from the public site's URL prefix) since
 * admin lives at `/admin`, not `/[locale]/admin`.
 */
export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const locale = await getAdminLocale();
  const messages = await getAdminMessages(locale);

  return (
    <html lang={locale} className={inter.variable}>
      <body className="bg-surface min-h-screen">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
