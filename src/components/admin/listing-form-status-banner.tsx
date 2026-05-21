'use client';

import type { SubmitState } from '@/hooks/use-listing-submit';
import { Alert } from '@/components/ui/alert';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';

type Props = {
  submitState: SubmitState;
  isEdit: boolean;
};

export function ListingFormStatusBanner({ submitState, isEdit }: Props) {
  if (submitState.phase === 'error') {
    return (
      <Alert variant="error">
        <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">
            {isEdit ? "Couldn't update the listing" : "Couldn't create the listing"}
          </p>
          <p className="text-xs">{submitState.message}</p>
        </div>
      </Alert>
    );
  }

  if (submitState.phase === 'success') {
    return (
      <Alert variant="success">
        <IconCheck size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">{isEdit ? 'Listing updated' : 'Listing created'}</p>
          <p className="text-xs">
            Slug: <code>{submitState.slug}</code>.
            {isEdit ? ' Changes saved.' : ' Form is reset — you can create another.'}
          </p>
        </div>
      </Alert>
    );
  }

  return null;
}
