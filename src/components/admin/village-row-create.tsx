'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateVillage } from '@/hooks/use-admin-villages';
import { IconCheck, IconLoader2, IconPlus } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Props = { regionId: string };

export function CreateVillageRow({ regionId }: Props) {
  const t = useTranslations('admin.villages');
  const tCommon = useTranslations('admin.common');
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
      setError(err instanceof Error ? err.message : tCommon('createFailed'));
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="border-border bg-accent/40 grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end"
    >
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">{t('nameEn')}</span>
        <Input
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder={t('namePlaceholderEn')}
          required
        />
      </label>
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">{t('nameRu')}</span>
        <Input
          value={nameRu}
          onChange={(e) => setNameRu(e.target.value)}
          placeholder={t('namePlaceholderRu')}
        />
      </label>
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">{t('nameAz')}</span>
        <Input
          value={nameAz}
          onChange={(e) => setNameAz(e.target.value)}
          placeholder={t('namePlaceholderAz')}
        />
      </label>
      <label className="block text-xs font-medium">
        <span className="text-foreground-muted">{t('order')}</span>
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
        {t('add')}
      </Button>
      {error ? <p className="col-span-full text-xs text-rose-700">{error}</p> : null}
    </form>
  );
}
