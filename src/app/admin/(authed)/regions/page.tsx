import { AdminRegionsList } from '@/components/admin/admin-regions-list';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: `${t('regions.title')} · ${t('appName')}` };
}

export default function AdminRegionsPage() {
  return <AdminRegionsList />;
}
