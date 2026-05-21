'use client';

import { AlertText } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteRegion } from '@/hooks/use-admin-regions';
import { IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type DeleteRegionDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  region: {
    id: string;
    title: string;
    listingCount: number;
    villageCount: number;
  } | null;
  onDeleted?: () => void;
};

export function DeleteRegionDialog({
  open,
  onOpenChange,
  region,
  onDeleted,
}: DeleteRegionDialogProps) {
  const t = useTranslations('admin.dialogs');
  const tRegion = useTranslations('admin.dialogs.deleteRegion');
  const tCommon = useTranslations('admin.common');
  const mutation = useDeleteRegion();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  if (!region) return null;

  const blocked = region.listingCount > 0 || region.villageCount > 0;

  const onConfirm = () => {
    setError(null);
    mutation.mutate(region.id, {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted?.();
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : tCommon('deleteFailed'));
      },
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
              <DialogTitle>{tRegion('title')}</DialogTitle>
              <DialogDescription>{t('cantBeUndone')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3 px-6 py-4 text-sm">
          <p>
            <span className="text-foreground-muted">{t('youreAboutToDelete')}</span>{' '}
            <strong>{region.title}</strong>.
          </p>
          {blocked ? (
            <AlertText variant="warning">
              {tRegion('blocked', {
                listings: region.listingCount,
                villages: region.villageCount,
              })}
            </AlertText>
          ) : null}
          {error ? <AlertText variant="error">{error}</AlertText> : null}
        </div>
        <div className="border-border flex items-center justify-end gap-2 border-t px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={mutation.isPending || blocked}
            className="gap-2"
          >
            {mutation.isPending ? (
              <>
                <IconLoader2 size={16} className="animate-spin" />
                {tRegion('deleting')}
              </>
            ) : (
              tRegion('confirm')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
