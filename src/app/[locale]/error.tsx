'use client';
// Client component because Next.js error boundaries must be client components.

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/typography';
import { useEffect } from 'react';

export default function LocaleErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-wide py-20 text-center">
      <Heading level="errorTitle">Something went wrong</Heading>
      <p className="text-foreground-muted mt-2">{error.message}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
