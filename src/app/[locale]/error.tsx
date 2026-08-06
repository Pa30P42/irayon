'use client';
// Client component because Next.js error boundaries must be client components.

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/typography';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export default function LocaleErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPage');
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-wide py-20 text-center">
      <Heading level="errorTitle">{t('title')}</Heading>
      <p className="text-foreground-muted mt-2">{error.message}</p>
      <Button className="mt-6" onClick={reset}>
        {t('retry')}
      </Button>
    </div>
  );
}
