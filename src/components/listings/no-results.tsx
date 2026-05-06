'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

type NoResultsProps = {
  onReset: () => void;
};

export function NoResults({ onReset }: NoResultsProps) {
  const t = useTranslations('listings');
  const tFilter = useTranslations('filter');

  return (
    <div className="border-border flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed py-20 text-center">
      <h3 className="text-lg font-semibold">{t('noResults')}</h3>
      <Button variant="outline" onClick={onReset}>
        {tFilter('reset')}
      </Button>
    </div>
  );
}
