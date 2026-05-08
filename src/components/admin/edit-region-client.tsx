'use client';

import { RegionForm } from '@/components/admin/region-form';
import { VillagesManager } from '@/components/admin/villages-manager';
import { useAdminRegion, useUpdateRegion } from '@/hooks/use-admin-regions';
import { IconLoader2 } from '@tabler/icons-react';

type EditRegionClientProps = {
  regionId: string;
};

export function EditRegionClient({ regionId }: EditRegionClientProps) {
  const { data, isLoading, isError, error } = useAdminRegion(regionId);
  const update = useUpdateRegion(regionId);

  if (isLoading) {
    return (
      <div className="text-foreground-muted flex items-center gap-2 py-12 text-sm">
        <IconLoader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error instanceof Error ? error.message : 'Region not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RegionForm
        mode="edit"
        slug={data.slug}
        initialValues={{
          name: data.name,
          coverImage: data.coverImage,
          featured: data.featured,
          sortOrder: data.sortOrder,
        }}
        onSubmit={async (values) => {
          await update.mutateAsync(values);
        }}
        submitLabel="Save changes"
      />
      <VillagesManager regionId={regionId} />
    </div>
  );
}
