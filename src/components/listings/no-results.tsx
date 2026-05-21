'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useTranslations } from 'next-intl';

type NoResultsProps = {
  onReset: () => void;
};

export function NoResults({ onReset }: NoResultsProps) {
  const t = useTranslations('listings');
  const tFilter = useTranslations('filter');

  return (
    <EmptyState
      title={t('noResults')}
      action={
        <Button variant="outline" onClick={onReset}>
          {tFilter('reset')}
        </Button>
      }
    />
  );
}
