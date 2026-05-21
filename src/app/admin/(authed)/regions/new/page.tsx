import { NewRegionClient } from '@/components/admin/new-region-client';
import { Heading } from '@/components/ui/typography';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: `${t('regions.newPage.title')} · ${t('appName')}` };
}

export default async function NewRegionPage() {
  const t = await getTranslations('admin.regions');
  return (
    <>
      <header className="mb-5">
        <p className="text-foreground-muted text-sm">
          <Link href="/admin/regions" className="hover:text-foreground">
            {t('breadcrumbRoot')}
          </Link>
          {' / '}
          <span>{t('breadcrumbNew')}</span>
        </p>
        <Heading as="h1" level="page" className="mt-1">
          {t('newPage.title')}
        </Heading>
      </header>
      <NewRegionClient />
    </>
  );
}
