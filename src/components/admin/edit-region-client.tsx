'use client';

import { RegionForm } from '@/components/admin/region-form';
import { VillagesManager } from '@/components/admin/villages-manager';
import { Alert } from '@/components/ui/alert';
import { useAdminRegion, useUpdateRegion } from '@/hooks/use-admin-regions';
import { IconLoader2 } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type EditRegionClientProps = {
  regionId: string;
};

export function EditRegionClient({ regionId }: EditRegionClientProps) {
  const t = useTranslations('admin');
  const { data, isLoading, isError, error } = useAdminRegion(regionId);
  const update = useUpdateRegion(regionId);

  if (isLoading) {
    return (
      <div className="text-foreground-muted flex items-center gap-2 py-12 text-sm">
        <IconLoader2 size={16} className="animate-spin" /> {t('common.loading')}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="error" size="lg" className="block">
        {error instanceof Error ? error.message : t('regions.editPage.notFound')}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <RegionForm
        mode="edit"
        slug={data.slug}
        regionId={regionId}
        initialValues={{
          name: data.name,
          coverImage: data.coverImage,
          featured: data.featured,
          sortOrder: data.sortOrder,
        }}
        onSubmit={async (values) => {
          await update.mutateAsync(values);
        }}
      />
      <VillagesManager regionId={regionId} />
    </div>
  );
}
