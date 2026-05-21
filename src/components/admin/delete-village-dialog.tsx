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
import { useDeleteVillage } from '@/hooks/use-admin-villages';
import type { Village } from '@/types';
import { IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';
import { useState } from 'react';

type Props = {
  regionId: string;
  village: Village | null;
  onOpenChange: (open: boolean) => void;
};

export function DeleteVillageDialog({ regionId, village, onOpenChange }: Props) {
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
          {error ? <AlertText variant="error">{error}</AlertText> : null}
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
            variant="destructive"
            onClick={onConfirm}
            disabled={del.isPending}
            className="gap-2"
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
