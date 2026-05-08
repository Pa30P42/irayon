'use client';

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
        setError(err instanceof Error ? err.message : 'Delete failed');
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
              <DialogTitle>Delete region?</DialogTitle>
              <DialogDescription>This can&apos;t be undone.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3 px-6 py-4 text-sm">
          <p>
            <span className="text-foreground-muted">You&apos;re about to delete</span>{' '}
            <strong>{region.title}</strong>.
          </p>
          {blocked ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This region has {region.listingCount} listing
              {region.listingCount === 1 ? '' : 's'} and {region.villageCount} village
              {region.villageCount === 1 ? '' : 's'}. Reassign or delete those first.
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
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={mutation.isPending || blocked}
            className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
          >
            {mutation.isPending ? (
              <>
                <IconLoader2 size={16} className="animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete region'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
