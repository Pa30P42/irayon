'use client';

import { Button } from '@/components/ui/button';
import { useAdminVillagesByRegion } from '@/hooks/use-admin-villages';
import type { Village } from '@/types';
import { IconAlertCircle, IconPencil, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { DeleteVillageDialog } from './delete-village-dialog';
import { CreateVillageRow } from './village-row-create';
import { EditVillageRow } from './village-row-edit';

type VillagesManagerProps = {
  regionId: string;
};

export function VillagesManager({ regionId }: VillagesManagerProps) {
  const { data, isLoading, isError, error, refetch } = useAdminVillagesByRegion(regionId);
  const villages = data ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Village | null>(null);

  return (
    <section className="border-border bg-background rounded-2xl border p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold sm:text-lg">Villages</h2>
          <p className="text-foreground-muted mt-1 text-sm">
            Sub-locations within this region. Used by listing filters and the listing form.
          </p>
        </div>
        <span className="text-foreground-muted text-xs">
          {villages.length} village{villages.length === 1 ? '' : 's'}
        </span>
      </header>

      <CreateVillageRow regionId={regionId} />

      <div className="mt-4">
        {isLoading ? (
          <p className="text-foreground-muted text-sm">Loading…</p>
        ) : isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Couldn&apos;t load villages</p>
              <p className="text-xs">{error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : villages.length === 0 ? (
          <p className="text-foreground-muted py-4 text-center text-sm">
            No villages yet. Add the first one above.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {villages.map((v) =>
              editingId === v.id ? (
                <li key={v.id} className="py-3">
                  <EditVillageRow
                    village={v}
                    regionId={regionId}
                    onDone={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li key={v.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{v.name.en}</p>
                    <p className="text-foreground-muted truncate text-xs">
                      <code className="text-[11px]">{v.slug}</code>
                      {' · '}
                      <span>
                        {v.name.az || '—'} / {v.name.ru || '—'}
                      </span>
                      {' · '}
                      <span>order {v.sortOrder}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(v.id)}
                      aria-label={`Edit ${v.name.en}`}
                      className="gap-1.5"
                    >
                      <IconPencil size={14} />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setToDelete(v)}
                      aria-label={`Delete ${v.name.en}`}
                      className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <IconTrash size={14} />
                    </Button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      <DeleteVillageDialog
        regionId={regionId}
        village={toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      />
    </section>
  );
}
