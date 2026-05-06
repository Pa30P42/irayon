'use client';
// Client component because Next.js error boundaries must be client components.

import { Button } from '@/components/ui/button';
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
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="text-foreground-muted mt-2">{error.message}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
