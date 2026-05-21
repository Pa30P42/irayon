'use client';

import type { SubmitState } from '@/hooks/use-listing-submit';
import { Button } from '@/components/ui/button';
import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import { IconLoader2 } from '@tabler/icons-react';
import { useFormContext } from 'react-hook-form';

type Props = {
  submitState: SubmitState;
  isEdit: boolean;
  isBusy: boolean;
  readyFileCount: number;
};

export function ListingFormActionBar({ submitState, isEdit, isBusy, readyFileCount }: Props) {
  const {
    watch,
    formState: { isValid },
  } = useFormContext<CreateListingInput>();
  const title = watch('title.en');

  return (
    <div className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur">
      <div className="container-wide flex items-center justify-between gap-3 py-3">
        <div className="text-foreground-muted hidden text-xs sm:block">
          {title || 'New listing'} · {readyFileCount} photo
          {readyFileCount === 1 ? '' : 's'}
        </div>
        <Button type="submit" size="lg" disabled={!isValid || isBusy} className="ml-auto gap-2">
          {isBusy ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              {submitState.phase === 'uploading'
                ? 'Uploading photos…'
                : submitState.phase === 'updating'
                  ? 'Saving…'
                  : 'Creating…'}
            </>
          ) : isEdit ? (
            'Save changes'
          ) : (
            'Create listing'
          )}
        </Button>
      </div>
    </div>
  );
}
