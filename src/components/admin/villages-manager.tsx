'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/typography';
import { useAdminVillagesByRegion } from '@/hooks/use-admin-villages';
import type { Village } from '@/types';
import { IconAlertCircle, IconPencil, IconTrash } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DeleteVillageDialog } from './delete-village-dialog';
import { CreateVillageRow } from './village-row-create';
import { EditVillageRow } from './village-row-edit';

type VillagesManagerProps = {
  regionId: string;
};

export function VillagesManager({ regionId }: VillagesManagerProps) {
  const t = useTranslations('admin.villages');
  const tCommon = useTranslations('admin.common');
  const tRegions = useTranslations('admin.regions');
  const { data, isLoading, isError, error, refetch } = useAdminVillagesByRegion(regionId);
  const villages = data ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Village | null>(null);

  return (
    <section className="border-border bg-background rounded-2xl border p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <Heading level="adminSubsection">{t('title')}</Heading>
          <p className="text-foreground-muted mt-1 text-sm">{t('description')}</p>
        </div>
        <span className="text-foreground-muted text-xs">
          {t('count', { count: villages.length })}
        </span>
      </header>

      <CreateVillageRow regionId={regionId} />

      <div className="mt-4">
        {isLoading ? (
          <p className="text-foreground-muted text-sm">{t('loading')}</p>
        ) : isError ? (
          <Alert variant="error" size="lg">
            <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{t('loadFailed')}</p>
              <p className="text-xs">
                {error instanceof Error ? error.message : tCommon('unknownError')}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
              {tCommon('retry')}
            </Button>
          </Alert>
        ) : villages.length === 0 ? (
          <p className="text-foreground-muted py-4 text-center text-sm">{t('empty')}</p>
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
                      <span>{tRegions('order', { value: v.sortOrder })}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(v.id)}
                      aria-label={t('editAria', { title: v.name.en })}
                      className="gap-1.5"
                    >
                      <IconPencil size={14} />
                      <span className="hidden sm:inline">{t('edit')}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="destructiveGhost"
                      size="sm"
                      onClick={() => setToDelete(v)}
                      aria-label={t('deleteAria', { title: v.name.en })}
                      className="gap-1.5"
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
