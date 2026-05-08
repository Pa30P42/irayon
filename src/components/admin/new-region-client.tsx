'use client';

import { RegionForm } from '@/components/admin/region-form';
import { useCreateRegion } from '@/hooks/use-admin-regions';
import { useRouter } from 'next/navigation';

export function NewRegionClient() {
  const router = useRouter();
  const create = useCreateRegion();

  return (
    <RegionForm
      mode="create"
      onSubmit={async (values) => {
        const result = await create.mutateAsync(values);
        router.push(`/admin/regions/${result.id}/edit`);
      }}
      submitLabel="Create region"
    />
  );
}
