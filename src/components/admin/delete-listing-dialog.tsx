'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteListing } from '@/hooks/use-delete-listing';
import { IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

type DeleteListingDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  listing: { id: string; title: string; photoCount: number } | null;
  onDeleted?: () => void;
};

export function DeleteListingDialog({
  open,
  onOpenChange,
  listing,
  onDeleted,
}: DeleteListingDialogProps) {
  const mutation = useDeleteListing();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  if (!listing) return null;

  const onConfirm = () => {
    setError(null);
    mutation.mutate(listing.id, {
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
              <DialogTitle>Delete listing?</DialogTitle>
              <DialogDescription>This can&apos;t be undone.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3 px-6 py-4 text-sm">
          <p>
            <span className="text-foreground-muted">You&apos;re about to delete</span>{' '}
            <strong>{listing.title}</strong>{' '}
            {listing.photoCount > 0 ? (
              <span className="text-foreground-muted">
                and {listing.photoCount} photo{listing.photoCount === 1 ? '' : 's'}
              </span>
            ) : null}
            .
          </p>
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
            disabled={mutation.isPending}
            className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
          >
            {mutation.isPending ? (
              <>
                <IconLoader2 size={16} className="animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete listing'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
