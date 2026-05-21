'use client';
// Next.js admin error boundary. Must be a client component.

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/typography';
import { useEffect } from 'react';

export default function AdminErrorBoundary({
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
      <Heading level="errorTitle">Admin error</Heading>
      <p className="text-foreground-muted mt-2 text-sm">{error.message}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
