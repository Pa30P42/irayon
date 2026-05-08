'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  useAdminVillagesByRegion,
  useCreateVillage,
  useDeleteVillage,
  useUpdateVillage,
} from '@/hooks/use-admin-villages';
import type { Village } from '@/types';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';

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

function CreateVillageRow({ regionId }: { regionId: string }) {
  const create = useCreateVillage(regionId);
  const [nameEn, setNameEn] = useState('');
  const [nameRu, setNameRu] = useState('');
  const [nameAz, setNameAz] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const reset = () => {
    setNameEn('');
    setNameRu('');
    setNameAz('');
    setSortOrder(0);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;
    setError(null);
    try {
      await create.mutateAsync({
        name: { en: nameEn.trim(), ru: nameRu.trim(), az: nameAz.trim() },
        sortOrder,
      });
      reset();
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="border-border bg-accent/40 grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end"
    >
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">Name (EN) *</span>
        <Input
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder="Vandam"
          required
        />
      </label>
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">Name (RU)</span>
        <Input value={nameRu} onChange={(e) => setNameRu(e.target.value)} placeholder="Вандам" />
      </label>
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">Name (AZ)</span>
        <Input value={nameAz} onChange={(e) => setNameAz(e.target.value)} placeholder="Vəndam" />
      </label>
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">Order</span>
        <Input
          type="number"
          inputMode="numeric"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          className="w-20"
        />
      </label>
      <Button
        type="submit"
        size="sm"
        disabled={!nameEn.trim() || create.isPending}
        className="gap-2"
      >
        {create.isPending ? (
          <IconLoader2 size={14} className="animate-spin" />
        ) : savedAt ? (
          <IconCheck size={14} />
        ) : (
          <IconPlus size={14} />
        )}
        Add
      </Button>
      {error ? <p className="col-span-full text-xs text-rose-700">{error}</p> : null}
    </form>
  );
}

function EditVillageRow({
  village,
  regionId,
  onDone,
}: {
  village: Village;
  regionId: string;
  onDone: () => void;
}) {
  const update = useUpdateVillage(regionId);
  const [nameEn, setNameEn] = useState(village.name.en);
  const [nameRu, setNameRu] = useState(village.name.ru);
  const [nameAz, setNameAz] = useState(village.name.az);
  const [sortOrder, setSortOrder] = useState(village.sortOrder);
  const [error, setError] = useState<string | null>(null);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;
    setError(null);
    try {
      await update.mutateAsync({
        id: village.id,
        input: {
          name: { en: nameEn.trim(), ru: nameRu.trim(), az: nameAz.trim() },
          sortOrder,
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <form
      onSubmit={onSave}
      className="border-primary/30 bg-primary/5 grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto_auto] sm:items-end"
    >
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">Name (EN) *</span>
        <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
      </label>
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">Name (RU)</span>
        <Input value={nameRu} onChange={(e) => setNameRu(e.target.value)} />
      </label>
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">Name (AZ)</span>
        <Input value={nameAz} onChange={(e) => setNameAz(e.target.value)} />
      </label>
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">Order</span>
        <Input
          type="number"
          inputMode="numeric"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          className="w-20"
        />
      </label>
      <Button
        type="submit"
        size="sm"
        disabled={!nameEn.trim() || update.isPending}
        className="gap-2"
      >
        {update.isPending ? (
          <IconLoader2 size={14} className="animate-spin" />
        ) : (
          <IconCheck size={14} />
        )}
        Save
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone} className="gap-1.5">
        <IconX size={14} />
        Cancel
      </Button>
      {error ? <p className="col-span-full text-xs text-rose-700">{error}</p> : null}
    </form>
  );
}

function DeleteVillageDialog({
  regionId,
  village,
  onOpenChange,
}: {
  regionId: string;
  village: Village | null;
  onOpenChange: (open: boolean) => void;
}) {
  const del = useDeleteVillage(regionId);
  const [error, setError] = useState<string | null>(null);
  const open = village !== null;

  const onConfirm = () => {
    if (!village) return;
    setError(null);
    del.mutate(village.id, {
      onSuccess: () => onOpenChange(false),
      onError: (err) => setError(err instanceof Error ? err.message : 'Delete failed'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-auto max-w-md sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-600">
              <IconAlertTriangle size={20} />
            </div>
            <div>
              <DialogTitle>Delete village?</DialogTitle>
              <DialogDescription>This can&apos;t be undone.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3 px-6 py-4 text-sm">
          {village ? (
            <p>
              <span className="text-foreground-muted">You&apos;re about to delete</span>{' '}
              <strong>{village.name.en}</strong>.
            </p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
        </div>
        <div className="border-border flex items-center justify-end gap-2 border-t px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={del.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={del.isPending}
            className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
          >
            {del.isPending ? (
              <>
                <IconLoader2 size={16} className="animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete village'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
