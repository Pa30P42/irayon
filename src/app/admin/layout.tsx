import { QueryProvider } from '@/components/providers/query-provider';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import '../globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'IRayon Admin',
  robots: { index: false, follow: false },
};

/**
 * Root /admin layout — only renders the html/body shell so the login page
 * (which lives outside the `(authed)` group) doesn't inherit the admin
 * header. The nested `(authed)/layout.tsx` adds the header + nav.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-surface min-h-screen">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
