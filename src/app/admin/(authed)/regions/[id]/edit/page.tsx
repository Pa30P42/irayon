import { EditRegionClient } from '@/components/admin/edit-region-client';
import { Heading } from '@/components/ui/typography';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: `${t('regions.editPage.title')} · ${t('appName')}` };
}

type Props = { params: Promise<{ id: string }> };

export default async function EditRegionPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations('admin.regions');
  return (
    <>
      <header className="mb-5">
        <p className="text-foreground-muted text-sm">
          <Link href="/admin/regions" className="hover:text-foreground">
            {t('breadcrumbRoot')}
          </Link>
          {' / '}
          <span>{t('breadcrumbEdit')}</span>
        </p>
        <Heading as="h1" level="page" className="mt-1">
          {t('editPage.title')}
        </Heading>
      </header>
      <EditRegionClient regionId={id} />
    </>
  );
}
