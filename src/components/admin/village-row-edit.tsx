'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpdateVillage } from '@/hooks/use-admin-villages';
import type { Village } from '@/types';
import { IconCheck, IconLoader2, IconX } from '@tabler/icons-react';
import { useState } from 'react';

type Props = {
  village: Village;
  regionId: string;
  onDone: () => void;
};

export function EditVillageRow({ village, regionId, onDone }: Props) {
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
