'use client';

import { Alert } from '@/components/ui/alert';
import type { SubmitState } from '@/hooks/use-listing-submit';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type Props = {
  submitState: SubmitState;
  isEdit: boolean;
};

export function ListingFormStatusBanner({ submitState, isEdit }: Props) {
  const t = useTranslations('admin.listingForm.statusBanner');

  if (submitState.phase === 'error') {
    return (
      <Alert variant="error">
        <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">{isEdit ? t('errorUpdateTitle') : t('errorCreateTitle')}</p>
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
          <p className="font-medium">
            {isEdit ? t('successUpdateTitle') : t('successCreateTitle')}
          </p>
          <p className="text-xs">
            {t('slugPrefix')} <code>{submitState.slug}</code>.{' '}
            {isEdit ? t('changesSaved') : t('resetMessage')}
          </p>
        </div>
      </Alert>
    );
  }

  return null;
}
